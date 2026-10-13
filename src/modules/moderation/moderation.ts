import {
  rootServer,
  ChannelGuid,
  UserGuid,
  MessageDirectionTake,
} from "@rootsdk/server-bot";
import { WarningsRepository } from "../../database/repositories/warnings";
import { SettingsRepository } from "../../database/repositories/settings";
import { AnalyticsRepository } from "../../database/repositories/analytics";
import { withRetry, pace } from "../../core/rate-limiter";
import { formatUserMention } from "../../utils/formatting";
import { Logger } from "../../core/logger";

const logger = new Logger("ModerationModule");

export class ModerationModule {
  constructor(
    private readonly warningsRepo: WarningsRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly analyticsRepo: AnalyticsRepository
  ) {}

  private async dispatchModLog(
    communityId: string,
    actionTitle: string,
    targetUserId: string,
    moderatorId: string,
    reason: string,
    details?: string
  ): Promise<void> {
    const settings = await this.settingsRepo.getSettings(communityId);
    if (!settings.moderationLogChannelId) return;

    const targetMention = formatUserMention(targetUserId);
    const modMention = formatUserMention(moderatorId);

    const logText = [
      `🛡️ **NEXUS MODERATION LOG**`,
      `━━━━━━━━━━━━━━━━━━`,
      `**Action:** ${actionTitle}`,
      `**Target:** ${targetMention} (\`${targetUserId}\`)`,
      `**Moderator:** ${modMention} (\`${moderatorId}\`)`,
      `**Reason:** ${reason}`,
      details ? `**Details:** ${details}` : "",
      `**Timestamp:** ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await withRetry(() =>
        rootServer.community.channelMessages.create({
          channelId: settings.moderationLogChannelId!,
          content: logText,
        })
      );
    } catch (err) {
      logger.error("Failed to post mod log to channel", err);
    }
  }

  async warnUser(
    communityId: string,
    targetUserId: string,
    moderatorId: string,
    reason: string
  ): Promise<{ warningCount: number }> {
    const warning = await this.warningsRepo.addWarning(communityId, targetUserId, moderatorId, reason);
    const count = await this.warningsRepo.getWarningCount(communityId, targetUserId);

    await this.analyticsRepo.recordModerationAction(communityId);
    await this.dispatchModLog(
      communityId,
      `Warning #${count}`,
      targetUserId,
      moderatorId,
      reason,
      `Warning ID: \`${warning.id}\``
    );

    return { warningCount: count };
  }

  async clearWarnings(
    communityId: string,
    targetUserId: string,
    moderatorId: string
  ): Promise<number> {
    const cleared = await this.warningsRepo.clearWarnings(communityId, targetUserId, moderatorId);
    if (cleared > 0) {
      await this.analyticsRepo.recordModerationAction(communityId);
      await this.dispatchModLog(
        communityId,
        "Clear Warnings",
        targetUserId,
        moderatorId,
        `Cleared ${cleared} prior warning(s)`
      );
    }
    return cleared;
  }

  async kickUser(
    communityId: string,
    targetUserId: UserGuid,
    moderatorId: string,
    reason: string
  ): Promise<void> {
    logger.info(`Kicking user ${targetUserId} by moderator ${moderatorId}`);
    await withRetry(() =>
      rootServer.community.communityMemberBans.kick({
        userId: targetUserId,
      })
    );

    await this.warningsRepo.addModerationLog(
      communityId,
      "kick",
      targetUserId,
      moderatorId,
      reason
    );

    await this.analyticsRepo.recordModerationAction(communityId);
    await this.dispatchModLog(communityId, "Kick", targetUserId, moderatorId, reason);
  }

  async banUser(
    communityId: string,
    targetUserId: UserGuid,
    moderatorId: string,
    reason: string,
    expiresAt?: Date
  ): Promise<void> {
    logger.info(`Banning user ${targetUserId} by moderator ${moderatorId}`);
    await withRetry(() =>
      rootServer.community.communityMemberBans.create({
        userId: targetUserId,
        reason,
        expiresAt,
      })
    );

    await this.warningsRepo.addModerationLog(
      communityId,
      "ban",
      targetUserId,
      moderatorId,
      reason
    );

    await this.analyticsRepo.recordModerationAction(communityId);
    const expiryText = expiresAt ? `Expires: ${expiresAt.toISOString()}` : "Permanent";
    await this.dispatchModLog(communityId, "Ban", targetUserId, moderatorId, reason, expiryText);
  }

  async purgeMessages(
    communityId: string,
    channelId: ChannelGuid,
    count: number,
    moderatorId: string
  ): Promise<number> {
    logger.info(`Purging up to ${count} messages in channel ${channelId}`);
    const fetchTake = Math.min(count, 50);

    const listRes = await withRetry(() =>
      rootServer.community.channelMessages.list({
        channelId,
        messageDirectionTake: MessageDirectionTake.Older,
        limit: fetchTake,
        dateAt: new Date(),
      })
    );

    if (!listRes.messages || listRes.messages.length === 0) {
      return 0;
    }

    let deletedCount = 0;
    for (const msg of listRes.messages) {
      try {
        await withRetry(() =>
          rootServer.community.channelMessages.delete({
            id: msg.id,
            channelId,
          })
        );
        deletedCount++;
        // Pace loop to maintain safe 4 req/s (250ms delay) below the ~5 req/s limit
        await pace(250);
      } catch (err) {
        logger.warn(`Failed to delete message ${msg.id} during purge`, { err });
      }
    }

    await this.warningsRepo.addModerationLog(
      communityId,
      "purge",
      "CHANNEL",
      moderatorId,
      `Purged ${deletedCount} messages`,
      channelId
    );

    await this.analyticsRepo.recordModerationAction(communityId);
    await this.dispatchModLog(
      communityId,
      "Purge",
      "MULTIPLE_MESSAGES",
      moderatorId,
      `Purged ${deletedCount} messages in channel <#${channelId}>`
    );

    return deletedCount;
  }
}
