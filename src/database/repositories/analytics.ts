import { DatabaseManager } from "../db";
import { AnalyticsDailyRecord } from "../../types/database";

export class AnalyticsRepository {
  constructor(private readonly db: DatabaseManager) {}

  private getTodayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  async ensureTodayRecord(communityId: string): Promise<void> {
    const today = this.getTodayDate();
    await this.db.run(
      `INSERT INTO analytics_daily (community_id, date, message_count, unique_active_users, commands_used, moderation_actions, new_members)
       VALUES (?, ?, 0, 0, 0, 0, 0)
       ON CONFLICT(community_id, date) DO NOTHING`,
      [communityId, today]
    );
  }

  async recordMessage(communityId: string): Promise<void> {
    await this.ensureTodayRecord(communityId);
    const today = this.getTodayDate();
    await this.db.run(
      `UPDATE analytics_daily SET message_count = message_count + 1 WHERE community_id = ? AND date = ?`,
      [communityId, today]
    );
  }

  async recordCommand(communityId: string): Promise<void> {
    await this.ensureTodayRecord(communityId);
    const today = this.getTodayDate();
    await this.db.run(
      `UPDATE analytics_daily SET commands_used = commands_used + 1 WHERE community_id = ? AND date = ?`,
      [communityId, today]
    );
  }

  async recordModerationAction(communityId: string): Promise<void> {
    await this.ensureTodayRecord(communityId);
    const today = this.getTodayDate();
    await this.db.run(
      `UPDATE analytics_daily SET moderation_actions = moderation_actions + 1 WHERE community_id = ? AND date = ?`,
      [communityId, today]
    );
  }

  async recordNewMember(communityId: string): Promise<void> {
    await this.ensureTodayRecord(communityId);
    const today = this.getTodayDate();
    await this.db.run(
      `UPDATE analytics_daily SET new_members = new_members + 1 WHERE community_id = ? AND date = ?`,
      [communityId, today]
    );
  }

  async getRecentSummary(communityId: string, days: number = 7): Promise<{
    totalMessages: number;
    totalCommands: number;
    totalModActions: number;
    totalNewMembers: number;
    records: AnalyticsDailyRecord[];
  }> {
    const records = await this.db.all<AnalyticsDailyRecord>(
      `SELECT * FROM analytics_daily WHERE community_id = ? ORDER BY date DESC LIMIT ?`,
      [communityId, days]
    );

    let totalMessages = 0;
    let totalCommands = 0;
    let totalModActions = 0;
    let totalNewMembers = 0;

    for (const r of records) {
      totalMessages += r.message_count;
      totalCommands += r.commands_used;
      totalModActions += r.moderation_actions;
      totalNewMembers += r.new_members;
    }

    return {
      totalMessages,
      totalCommands,
      totalModActions,
      totalNewMembers,
      records,
    };
  }
}
