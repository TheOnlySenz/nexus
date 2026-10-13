import { DatabaseManager } from "../db";
import { UserXpRecord, LevelRewardRecord } from "../../types/database";

/**
 * Level curve: XP required for level N = 100 * (level^1.5)
 * Level = floor((xp / 100) ^ (1 / 1.5))
 */
export function calculateLevelFromXp(xp: number): number {
  if (xp <= 0) return 0;
  return Math.floor(Math.pow(xp / 100, 1 / 1.5));
}

export function calculateXpRequiredForLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.ceil(100 * Math.pow(level, 1.5));
}

export class XpRepository {
  constructor(private readonly db: DatabaseManager) {}

  async getUserXp(communityId: string, userId: string): Promise<UserXpRecord | undefined> {
    return this.db.get<UserXpRecord>(
      `SELECT * FROM xp_users WHERE community_id = ? AND user_id = ?`,
      [communityId, userId]
    );
  }

  async addXp(
    communityId: string,
    userId: string,
    amount: number
  ): Promise<{ record: UserXpRecord; leveledUp: boolean; oldLevel: number; newLevel: number }> {
    const existing = await this.getUserXp(communityId, userId);
    const now = new Date().toISOString();

    const currentXp = existing ? existing.xp : 0;
    const oldLevel = existing ? existing.level : 0;
    const messageCount = existing ? existing.message_count + 1 : 1;
    const newXp = currentXp + amount;
    const newLevel = calculateLevelFromXp(newXp);
    const leveledUp = newLevel > oldLevel;

    await this.db.run(
      `INSERT INTO xp_users (community_id, user_id, xp, level, message_count, last_message_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(community_id, user_id) DO UPDATE SET
         xp = excluded.xp,
         level = excluded.level,
         message_count = excluded.message_count,
         last_message_at = excluded.last_message_at,
         updated_at = excluded.updated_at`,
      [communityId, userId, newXp, newLevel, messageCount, now, now]
    );

    const record: UserXpRecord = {
      community_id: communityId,
      user_id: userId,
      xp: newXp,
      level: newLevel,
      message_count: messageCount,
      last_message_at: now,
      updated_at: now,
    };

    return { record, leveledUp, oldLevel, newLevel };
  }

  async getLeaderboard(communityId: string, limit: number = 10, offset: number = 0): Promise<UserXpRecord[]> {
    return this.db.all<UserXpRecord>(
      `SELECT * FROM xp_users WHERE community_id = ? ORDER BY xp DESC LIMIT ? OFFSET ?`,
      [communityId, limit, offset]
    );
  }

  async getUserRank(communityId: string, userId: string): Promise<number> {
    const user = await this.getUserXp(communityId, userId);
    if (!user) return 0;

    const res = await this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM xp_users WHERE community_id = ? AND xp > ?`,
      [communityId, user.xp]
    );

    return (res?.count ?? 0) + 1;
  }

  async getLevelRewards(communityId: string): Promise<LevelRewardRecord[]> {
    return this.db.all<LevelRewardRecord>(
      `SELECT * FROM level_rewards WHERE community_id = ? ORDER BY level ASC`,
      [communityId]
    );
  }

  async getRewardForLevel(communityId: string, level: number): Promise<LevelRewardRecord | undefined> {
    return this.db.get<LevelRewardRecord>(
      `SELECT * FROM level_rewards WHERE community_id = ? AND level = ?`,
      [communityId, level]
    );
  }

  async setLevelReward(
    communityId: string,
    level: number,
    roleId: string,
    roleName: string
  ): Promise<LevelRewardRecord> {
    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO level_rewards (community_id, level, role_id, role_name, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(community_id, level) DO UPDATE SET
         role_id = excluded.role_id,
         role_name = excluded.role_name,
         created_at = excluded.created_at`,
      [communityId, level, roleId, roleName, now]
    );

    return {
      community_id: communityId,
      level,
      role_id: roleId,
      role_name: roleName,
      created_at: now,
    };
  }

  async removeLevelReward(communityId: string, level: number): Promise<boolean> {
    const res = await this.db.run(
      `DELETE FROM level_rewards WHERE community_id = ? AND level = ?`,
      [communityId, level]
    );
    return res.changes > 0;
  }
}
