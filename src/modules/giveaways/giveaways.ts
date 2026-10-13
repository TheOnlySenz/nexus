import {
  rootServer,
  JobInterval,
  JobData,
  ChannelGuid,
  MessageGuid,
} from "@rootsdk/server-bot";
import { GiveawaysRepository } from "../../database/repositories/giveaways";
import { formatUserMention, CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";
import { withRetry } from "../../core/rate-limiter";
import { Logger } from "../../core/logger";

const logger = new Logger("GiveawaysModule");

export class GiveawaysModule {
  constructor(private readonly giveawaysRepo: GiveawaysRepository) {}

  async createGiveaway(
    communityId: string,
    channelId: ChannelGuid,
    prize: string,
    winnerCount: number,
    durationMs: number,
    creatorId: string
  ): Promise<{ giveawayId: string; messageId: string }> {
    const endsAt = new Date(Date.now() + durationMs);

    // 1. Post initial giveaway announcement message
    const initialText = [
      `🎁 **MOCHI COMMUNITY GIVEAWAY** 🎁`,
      CUTE_DIVIDER,
      `🎀 **Prize:** ${prize}`,
      `✨ **Lucky Winners:** ${winnerCount}`,
      `⏳ **Ends:** ${endsAt.toUTCString()}`,
      `🌸 **Hosted by:** ${formatUserMention(creatorId)}`,
      SAKURA_DIVIDER,
      `React with 🎉 or use \`!giveaway enter <id>\` to participate! (◕ᴗ◕✿)`,
    ].join("\n");


    const message = await withRetry(() =>
      rootServer.community.channelMessages.create({
        channelId,
        content: initialText,
      })
    );

    // Add 🎉 reaction to the message
    try {
      await withRetry(() =>
        rootServer.community.channelMessages.reactionCreate({
          channelId,
          messageId: message.id,
          shortcode: ":tada:",
        })
      );
    } catch (reactionErr) {
      logger.warn("Could not add initial reaction to giveaway message", { reactionErr });
    }

    // 2. Persist to database
    const record = await this.giveawaysRepo.create(
      communityId,
      channelId,
      message.id,
      prize,
      winnerCount,
      endsAt.toISOString(),
      creatorId
    );

    // 3. Schedule Root cloud job
    try {
      if (rootServer.jobScheduler) {
        await rootServer.jobScheduler.create({
          resourceId: record.id,
          tag: "giveaway",
          jobInterval: JobInterval.OneTime,
          start: endsAt,
        });
        logger.info(`Scheduled Root JobScheduler task for giveaway ${record.id} at ${endsAt.toISOString()}`);
      }
    } catch (schedErr) {
      logger.error("Failed to register job in Root JobScheduler", schedErr);
    }

    return { giveawayId: record.id, messageId: message.id };
  }

  async enterGiveaway(giveawayId: string, userId: string): Promise<boolean> {
    const giveaway = await this.giveawaysRepo.getById(giveawayId);
    if (!giveaway || giveaway.status !== "active") {
      return false;
    }

    const now = new Date().toISOString();
    if (giveaway.ends_at <= now) {
      return false;
    }

    return this.giveawaysRepo.addEntry(giveawayId, userId);
  }

  async handleReaction(messageId: string, userId: string, emojiShortcode: string): Promise<boolean> {
    if (emojiShortcode !== ":tada:" && emojiShortcode !== "🎉") {
      return false;
    }

    const giveaway = await this.giveawaysRepo.getByMessageId(messageId);
    if (!giveaway || giveaway.status !== "active") {
      return false;
    }

    const entered = await this.enterGiveaway(giveaway.id, userId);
    if (entered) {
      logger.info(`User ${userId} entered giveaway ${giveaway.id} via reaction 🎉`);
    }
    return entered;
  }


  async concludeGiveaway(giveawayId: string): Promise<void> {
    const giveaway = await this.giveawaysRepo.getById(giveawayId);
    if (!giveaway || giveaway.status !== "active") return;

    logger.info(`Concluding giveaway ${giveawayId} (Prize: ${giveaway.prize})`);

    const entries = await this.giveawaysRepo.getEntries(giveawayId);
    const winners: string[] = [];

    if (entries.length > 0) {
      // Pick random unique winners
      const pool = [...entries];
      const count = Math.min(giveaway.winner_count, pool.length);

      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        winners.push(pool[idx]);
        pool.splice(idx, 1);
      }
    }

    await this.giveawaysRepo.complete(giveawayId, winners);

    // Format announcement
    let winnerText = "No valid entries were recorded.";
    if (winners.length > 0) {
      winnerText = winners.map((w) => formatUserMention(w)).join(", ");
    }

    const resultMessage = [
      `🎁 **GIVEAWAY CONCLUDED** 🎁`,
      CUTE_DIVIDER,
      `🌸 **Prize:** ${giveaway.prize}`,
      `🎉 **Winner(s):** ${winnerText}`,
      `🎟️ **Total Entries:** ${entries.length}`,
      SAKURA_DIVIDER,
      `*(人´∀｀) Congratulations to our lovely winner(s)! Thank you everyone for joining!*`,
    ].join("\n");

    try {
      await withRetry(() =>
        rootServer.community.channelMessages.create({
          channelId: giveaway.channel_id as ChannelGuid,
          content: resultMessage,
        })
      );
    } catch (err) {
      logger.error(`Failed to post giveaway conclusion message for ${giveawayId}`, err);
    }
  }

  async handleJobEvent(data: JobData): Promise<void> {
    if (data.tag === "giveaway" && data.resourceId) {
      await this.concludeGiveaway(data.resourceId);
    }
  }

  /**
   * Reconciles any active giveaways whose end times have passed (e.g. after bot restart or long outage).
   */
  async reconcileActiveGiveaways(): Promise<void> {
    const nowIso = new Date().toISOString();
    const dueGiveaways = await this.giveawaysRepo.getAllActiveDue(nowIso);

    if (dueGiveaways.length > 0) {
      logger.info(`Reconciling ${dueGiveaways.length} overdue giveaway(s) on startup`);
      for (const g of dueGiveaways) {
        await this.concludeGiveaway(g.id);
      }
    }
  }
}
