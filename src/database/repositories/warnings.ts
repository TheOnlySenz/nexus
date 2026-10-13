import { DatabaseManager } from "../db";
import { WarningRecord, ModerationLogRecord } from "../../types/database";

export class WarningsRepository {
  constructor(private readonly db: DatabaseManager) {}

  async addWarning(
    communityId: string,
    userId: string,
    moderatorId: string,
    reason: string
  ): Promise<WarningRecord> {
    const id = `warn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO warnings (id, community_id, user_id, moderator_id, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, communityId, userId, moderatorId, reason, now]
    );

    // Also record to persistent moderation logs
    await this.addModerationLog(communityId, "warn", userId, moderatorId, reason);

    return {
      id,
      community_id: communityId,
      user_id: userId,
      moderator_id: moderatorId,
      reason,
      created_at: now,
    };
  }

  async getWarnings(communityId: string, userId: string): Promise<WarningRecord[]> {
    return this.db.all<WarningRecord>(
      `SELECT * FROM warnings WHERE community_id = ? AND user_id = ? ORDER BY created_at DESC, rowid DESC`,
      [communityId, userId]
    );
  }

  async getWarningCount(communityId: string, userId: string): Promise<number> {
    const res = await this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM warnings WHERE community_id = ? AND user_id = ?`,
      [communityId, userId]
    );
    return res?.count ?? 0;
  }

  async clearWarnings(communityId: string, userId: string, moderatorId: string): Promise<number> {
    const existing = await this.getWarnings(communityId, userId);
    if (existing.length === 0) return 0;

    await this.db.run(
      `DELETE FROM warnings WHERE community_id = ? AND user_id = ?`,
      [communityId, userId]
    );

    await this.addModerationLog(
      communityId,
      "clearwarnings",
      userId,
      moderatorId,
      `Cleared ${existing.length} warning(s)`
    );

    return existing.length;
  }

  async addModerationLog(
    communityId: string,
    action: ModerationLogRecord["action"],
    targetUserId: string,
    moderatorId: string,
    reason: string,
    channelId: string | null = null,
    messageId: string | null = null
  ): Promise<ModerationLogRecord> {
    const id = `modlog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO moderation_logs (id, community_id, action, target_user_id, moderator_id, reason, channel_id, message_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, communityId, action, targetUserId, moderatorId, reason, channelId, messageId, now]
    );

    return {
      id,
      community_id: communityId,
      action,
      target_user_id: targetUserId,
      moderator_id: moderatorId,
      reason,
      channel_id: channelId,
      message_id: messageId,
      created_at: now,
    };
  }

  async getRecentModerationLogs(communityId: string, limit: number = 10): Promise<ModerationLogRecord[]> {
    return this.db.all<ModerationLogRecord>(
      `SELECT * FROM moderation_logs WHERE community_id = ? ORDER BY created_at DESC LIMIT ?`,
      [communityId, limit]
    );
  }
}
