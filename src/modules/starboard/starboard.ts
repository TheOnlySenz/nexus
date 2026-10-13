import { rootServer, ChannelGuid, ChannelMessageReactionCreatedEvent } from "@rootsdk/server-bot";
import { StarboardRepository } from "../../database/repositories/starboard";
import { SettingsRepository } from "../../database/repositories/settings";
import { formatUserMention, formatChannelMention, CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";
import { withRetry } from "../../core/rate-limiter";
import { Logger } from "../../core/logger";

const logger = new Logger("StarboardModule");

export class StarboardModule {
  // In-memory counter for fast reaction aggregation: messageId -> Set<userId>
  private starTrackers = new Map<string, Set<string>>();

  constructor(
    private readonly starboardRepo: StarboardRepository,
    private readonly settingsRepo: SettingsRepository
  ) {}

  async handleReactionCreated(
    evt: ChannelMessageReactionCreatedEvent,
    communityId: string
  ): Promise<void> {
    const isStar = evt.shortcode === ":star:" || evt.shortcode === "⭐";
    if (!isStar || !evt.messageId || !evt.userId || !evt.channelId) {
      return;
    }

    const settings = await this.settingsRepo.getSettings(communityId);
    if (!settings.starboardChannelId) {
      // Starboard channel not configured
      return;
    }

    // Do not self-star starboard messages in the starboard channel itself
    if (evt.channelId === settings.starboardChannelId) {
      return;
    }

    // Track star reaction
    let starrers = this.starTrackers.get(evt.messageId);
    if (!starrers) {
      starrers = new Set<string>();
      this.starTrackers.set(evt.messageId, starrers);
    }
    starrers.add(evt.userId);

    const starCount = starrers.size;
    const threshold = settings.starboardThreshold || 3;

    if (starCount < threshold) {
      return;
    }

    // Check if already posted
    const existing = await this.starboardRepo.getStarboardMessage(communityId, evt.messageId);
    if (existing) {
      // Update star count
      await this.starboardRepo.updateStarCount(communityId, evt.messageId, starCount);
      return;
    }

    // Retrieve original message content
    let content = "(Attachment or embed)";
    let authorId = evt.userId;

    try {
      const msg = await rootServer.community.channelMessages.get({
        id: evt.messageId,
        channelId: evt.channelId as ChannelGuid,
      });
      if (msg) {
        if (msg.messageContent) content = msg.messageContent;
        if (msg.userId) authorId = msg.userId;
      }
    } catch (fetchErr) {
      logger.warn("Could not fetch original message for starboard", { fetchErr });
    }

    const authorMention = formatUserMention(authorId);
    const channelMention = formatChannelMention(evt.channelId);

    const card = [
      `⭐ **SWEET HIGHLIGHT** • **${starCount} Stars** 🌸`,
      CUTE_DIVIDER,
      `> "${content}"`,
      SAKURA_DIVIDER,
      `🌸 **Author:** ${authorMention} | 📍 **Channel:** ${channelMention}`,
    ].join("\n");

    try {
      const posted = await withRetry(() =>
        rootServer.community.channelMessages.create({
          channelId: settings.starboardChannelId as ChannelGuid,
          content: card,
        })
      );

      const starboardMsgId = (posted as any)?.id || `sb_${Date.now()}`;
      await this.starboardRepo.createStarboardMessage({
        community_id: communityId,
        original_message_id: evt.messageId,
        starboard_message_id: starboardMsgId,
        channel_id: evt.channelId,
        author_id: authorId,
        star_count: starCount,
        created_at: new Date().toISOString(),
      });

      logger.info(`Promoted message ${evt.messageId} to starboard #${settings.starboardChannelId}`);
    } catch (postErr) {
      logger.error("Failed to post message to starboard channel", postErr);
    }
  }
}
