import { DatabaseManager } from "../db";
import { UserAchievementRecord } from "../../types/database";

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  rewardXp: number;
}

export const ACHIEVEMENTS: Record<string, AchievementDefinition> = {
  FIRST_MESSAGE: {
    id: "FIRST_MESSAGE",
    name: "First Words",
    description: "Sent your first message in the community.",
    rewardXp: 25,
  },
  LEVEL_5: {
    id: "LEVEL_5",
    name: "Getting Started",
    description: "Reached level 5 in the community.",
    rewardXp: 50,
  },
  LEVEL_10: {
    id: "LEVEL_10",
    name: "Community Regular",
    description: "Reached level 10 in the community.",
    rewardXp: 100,
  },
  LEVEL_25: {
    id: "LEVEL_25",
    name: "Veteran Member",
    description: "Reached level 25 in the community.",
    rewardXp: 250,
  },
  MESSAGES_100: {
    id: "MESSAGES_100",
    name: "Centurion",
    description: "Sent 100 messages.",
    rewardXp: 75,
  },
  MESSAGES_1000: {
    id: "MESSAGES_1000",
    name: "Conversationalist",
    description: "Sent 1,000 messages.",
    rewardXp: 300,
  },
  FIRST_REACTION: {
    id: "FIRST_REACTION",
    name: "Reactor",
    description: "Added your first reaction to a message.",
    rewardXp: 20,
  },
  DAILY_CLAIM: {
    id: "DAILY_CLAIM",
    name: "Daily Pioneer",
    description: "Claimed your first daily credit reward.",
    rewardXp: 30,
  },
};

export class AchievementsRepository {
  constructor(private readonly db: DatabaseManager) {}

  async getUserAchievements(communityId: string, userId: string): Promise<UserAchievementRecord[]> {
    return this.db.all<UserAchievementRecord>(
      `SELECT * FROM user_achievements WHERE community_id = ? AND user_id = ? ORDER BY unlocked_at DESC`,
      [communityId, userId]
    );
  }

  async hasAchievement(communityId: string, userId: string, achievementId: string): Promise<boolean> {
    const res = await this.db.get<UserAchievementRecord>(
      `SELECT * FROM user_achievements WHERE community_id = ? AND user_id = ? AND achievement_id = ?`,
      [communityId, userId, achievementId]
    );
    return Boolean(res);
  }

  async unlockAchievement(
    communityId: string,
    userId: string,
    achievementId: string
  ): Promise<{ unlocked: boolean; achievement: AchievementDefinition | undefined }> {
    const def = ACHIEVEMENTS[achievementId];
    if (!def) return { unlocked: false, achievement: undefined };

    const alreadyUnlocked = await this.hasAchievement(communityId, userId, achievementId);
    if (alreadyUnlocked) {
      return { unlocked: false, achievement: def };
    }

    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO user_achievements (community_id, user_id, achievement_id, unlocked_at)
       VALUES (?, ?, ?, ?)`,
      [communityId, userId, achievementId, now]
    );

    return { unlocked: true, achievement: def };
  }
}
