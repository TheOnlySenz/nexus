import {
  rootServer,
  JobInterval,
  JobData,
  ChannelGuid,
} from "@rootsdk/server-bot";
import { RemindersRepository } from "../../database/repositories/reminders";
import { formatUserMention, CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";
import { withRetry } from "../../core/rate-limiter";
import { Logger } from "../../core/logger";

const logger = new Logger("RemindersModule");

export class RemindersModule {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly remindersRepo: RemindersRepository) {}

  startPolling(intervalMs = 15000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.processDueReminders().catch((err) => {
        logger.warn("Error processing due reminders", { err });
      });
    }, intervalMs);
    // Run immediately once
    this.processDueReminders().catch(() => {});
  }

  stopPolling(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async createReminder(
    communityId: string,
    channelId: ChannelGuid,
    userId: string,
    message: string,
    durationMs: number
  ): Promise<{ id: string; remindAt: Date }> {
    const id = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const remindAt = new Date(Date.now() + durationMs);

    await this.remindersRepo.createReminder({
      id,
      community_id: communityId,
      channel_id: channelId,
      user_id: userId,
      message,
      remind_at: remindAt.toISOString(),
      created_at: new Date().toISOString(),
      status: "pending",
    });

    // Schedule Root cloud job
    try {
      if (rootServer.jobScheduler) {
        await rootServer.jobScheduler.create({
          resourceId: id,
          tag: "reminder",
          jobInterval: JobInterval.OneTime,
          start: remindAt,
        });
        logger.info(`Scheduled Root JobScheduler task for reminder ${id} at ${remindAt.toISOString()}`);
      }
    } catch (schedErr) {
      logger.warn("Could not register job in Root JobScheduler; relying on local poller", { schedErr });
    }

    return { id, remindAt };
  }

  async processDueReminders(): Promise<void> {
    const nowIso = new Date().toISOString();
    const due = await this.remindersRepo.getPendingReminders(nowIso);

    for (const reminder of due) {
      await this.dispatchReminder(reminder.id);
    }
  }

  async dispatchReminder(reminderId: string): Promise<void> {
    const dueList = await this.remindersRepo.getPendingReminders(new Date(Date.now() + 60000).toISOString());
    const matched = dueList.find((r) => r.id === reminderId);
    if (!matched) return;

    await this.remindersRepo.markDelivered(reminderId);

    const userMention = formatUserMention(matched.user_id);
    const card = [
      `⏰ **GENTLE MOCHI REMINDER!** 🌸`,
      CUTE_DIVIDER,
      `*Ding ding!* Hey ${userMention}, you asked me to remind you:`,
      `> "${matched.message}"`,
      SAKURA_DIVIDER,
      `*(◕ᴗ◕✿) Hope you're having a sweet and cozy day!*`,
    ].join("\n");

    try {
      await withRetry(() =>
        rootServer.community.channelMessages.create({
          channelId: matched.channel_id as ChannelGuid,
          content: card,
        })
      );
      logger.info(`Dispatched reminder ${reminderId} to user ${matched.user_id}`);
    } catch (err) {
      logger.error(`Failed to send reminder message ${reminderId}`, err);
    }
  }

  async handleJobEvent(data: JobData): Promise<void> {
    if (data.tag === "reminder" && data.resourceId) {
      await this.dispatchReminder(data.resourceId);
    }
  }
}
