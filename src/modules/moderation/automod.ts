import { ChannelMessageCreatedEvent, rootServer } from "@rootsdk/server-bot";
import { SettingsRepository } from "../../database/repositories/settings";
import { WarningsRepository } from "../../database/repositories/warnings";
import { AnalyticsRepository } from "../../database/repositories/analytics";
import { withRetry } from "../../core/rate-limiter";
import { formatUserMention } from "../../utils/formatting";
import { Logger } from "../../core/logger";

const logger = new Logger("AutomodModule");

interface UserMessageHistory {
  timestamps: number[];
  lastContent?: string;
}

export class AutomodModule {
  private messageHistory: Map<string, UserMessageHistory> = new Map();

  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly warningsRepo: WarningsRepository,
    private readonly analyticsRepo: AnalyticsRepository
  ) {}

  async processMessage(evt: ChannelMessageCreatedEvent, communityId: string): Promise<boolean> {
    if (!evt.messageContent || !evt.userId) return false;

    const settings = await this.settingsRepo.getSettings(communityId);
    if (!settings.automodEnabled) return false;

    const userId = evt.userId;
    const content = evt.messageContent;
    const now = Date.now();

    // 1. Spam / Flood check
    let history = this.messageHistory.get(userId);
    if (!history) {
      history = { timestamps: [] };
      this.messageHistory.set(userId, history);
    }

    // Keep only timestamps within last 5 seconds
    history.timestamps = history.timestamps.filter((t) => now - t < 5000);
    history.timestamps.push(now);

    const isFlooding = history.timestamps.length > settings.automodSpamThreshold;

    // 2. Blocked links check
    const hasLinks =
      settings.automodBlockLinks &&
      (content.includes("http://") ||
        content.includes("https://") ||
        content.includes("discord.gg/") ||
        content.includes(".xyz") ||
        content.includes(".top"));

    // 3. Blocked words check
    let hasBlockedWord = false;
    let matchedWord = "";
    if (settings.automodBlockWords.length > 0) {
      const lower = content.toLowerCase();
      for (const word of settings.automodBlockWords) {
        if (word && lower.includes(word.toLowerCase())) {
          hasBlockedWord = true;
          matchedWord = word;
          break;
        }
      }
    }

    // 4. Excessive repeated characters (e.g. aaaaaaa... 15+ times)
    const hasRepeatedChars = /(.)\1{14,}/.test(content);

    let violationReason: string | null = null;
    if (isFlooding) {
      violationReason = "Message spam / flood detected";
    } else if (hasBlockedWord) {
      violationReason = `Prohibited keyword detected: '${matchedWord}'`;
    } else if (hasLinks) {
      violationReason = "Posting unapproved links is not permitted";
    } else if (hasRepeatedChars) {
      violationReason = "Excessive repeated characters spam";
    }

    if (!violationReason) return false;

    logger.warn(`Automod triggered for user ${userId} in channel ${evt.channelId}: ${violationReason}`);

    // Take Root-native action: delete the message
    try {
      await withRetry(() =>
        rootServer.community.channelMessages.delete({
          id: evt.id,
          channelId: evt.channelId,
        })
      );

      // Notify the channel
      const userMention = formatUserMention(userId);
      await withRetry(() =>
        rootServer.community.channelMessages.create({
          channelId: evt.channelId,
          content: `🛡️ ${userMention} Your message was removed by Automod: **${violationReason}**.`,
        })
      );

      // Record to warnings repo and moderation logs
      await this.warningsRepo.addModerationLog(
        communityId,
        "automod_delete",
        userId,
        "SYSTEM_AUTOMOD",
        violationReason,
        evt.channelId,
        evt.id
      );

      await this.analyticsRepo.recordModerationAction(communityId);
      return true;
    } catch (err) {
      logger.error(`Automod action failed for message ${evt.id}`, err);
      return false;
    }
  }
}
