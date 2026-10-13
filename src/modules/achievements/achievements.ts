import { rootServer, ChannelGuid } from "@rootsdk/server-bot";
import { AchievementsRepository, ACHIEVEMENTS } from "../../database/repositories/achievements";
import { XpRepository } from "../../database/repositories/xp";
import { formatUserMention, CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";
import { withRetry } from "../../core/rate-limiter";
import { Logger } from "../../core/logger";

const logger = new Logger("AchievementsModule");

export class AchievementsModule {
  constructor(
    private readonly achievementsRepo: AchievementsRepository,
    private readonly xpRepo: XpRepository
  ) {}

  async checkAndUnlock(
    communityId: string,
    userId: string,
    achievementId: string,
    channelId?: ChannelGuid
  ): Promise<boolean> {
    const result = await this.achievementsRepo.unlockAchievement(communityId, userId, achievementId);
    if (!result.unlocked || !result.achievement) {
      return false;
    }

    const ach = result.achievement;
    logger.info(`Achievement unlocked for user ${userId}: ${ach.name} (+${ach.rewardXp} XP)`);

    // Award bonus XP for achievement
    if (ach.rewardXp > 0) {
      await this.xpRepo.addXp(communityId, userId, ach.rewardXp);
    }

    // Announce achievement if channelId provided
    if (channelId) {
      const userMention = formatUserMention(userId);
      const text = [
        `🏆 **ACHIEVEMENT UNLOCKED!** 🏆`,
        CUTE_DIVIDER,
        `Congratulations ${userMention}! (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧`,
        `🎀 **${ach.name}**`,
        `*${ach.description}* (+${ach.rewardXp} XP)`,
        SAKURA_DIVIDER,
      ].join("\n");

      try {
        await withRetry(() =>
          rootServer.community.channelMessages.create({
            channelId,
            content: text,
          })
        );
      } catch (err) {
        logger.warn("Failed to announce achievement unlock", { err });
      }
    }

    return true;
  }
}

