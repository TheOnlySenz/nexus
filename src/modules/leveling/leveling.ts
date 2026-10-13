import { rootServer, ChannelGuid, CommunityRoleGuid, UserGuid } from "@rootsdk/server-bot";
import { XpRepository } from "../../database/repositories/xp";
import { SettingsRepository } from "../../database/repositories/settings";
import { AchievementsModule } from "../achievements/achievements";
import { CooldownManager, withRetry } from "../../core/rate-limiter";
import { formatUserMention, formatRoleMention, CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";
import { Logger } from "../../core/logger";

const logger = new Logger("LevelingModule");

export class LevelingModule {
  private xpCooldowns = new CooldownManager();

  constructor(
    private readonly xpRepo: XpRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly achievementsModule: AchievementsModule
  ) {}

  async processMessageXp(
    communityId: string,
    userId: string,
    channelId: ChannelGuid
  ): Promise<void> {
    const settings = await this.settingsRepo.getSettings(communityId);
    if (!settings.xpEnabled) return;

    // Check per-user XP cooldown
    const cooldownKey = `xp:${communityId}:${userId}`;
    const { onCooldown } = this.xpCooldowns.check(
      cooldownKey,
      settings.xpCooldownSeconds * 1000,
      true
    );

    if (onCooldown) return;

    // Generate random XP between min and max
    const min = settings.minXpPerMessage;
    const max = settings.maxXpPerMessage;
    const awarded = Math.floor(Math.random() * (max - min + 1)) + min;

    const { record, leveledUp, oldLevel, newLevel } = await this.xpRepo.addXp(
      communityId,
      userId,
      awarded
    );

    // Check message count achievements
    if (record.message_count === 1) {
      await this.achievementsModule.checkAndUnlock(communityId, userId, "FIRST_MESSAGE", channelId);
    } else if (record.message_count === 100) {
      await this.achievementsModule.checkAndUnlock(communityId, userId, "MESSAGES_100", channelId);
    } else if (record.message_count === 1000) {
      await this.achievementsModule.checkAndUnlock(communityId, userId, "MESSAGES_1000", channelId);
    }

    if (leveledUp) {
      logger.info(`User ${userId} leveled up from ${oldLevel} to ${newLevel}!`);

      // Check level achievements
      if (newLevel >= 5) {
        await this.achievementsModule.checkAndUnlock(communityId, userId, "LEVEL_5", channelId);
      }
      if (newLevel >= 10) {
        await this.achievementsModule.checkAndUnlock(communityId, userId, "LEVEL_10", channelId);
      }
      if (newLevel >= 25) {
        await this.achievementsModule.checkAndUnlock(communityId, userId, "LEVEL_25", channelId);
      }

      // Check role reward
      const reward = await this.xpRepo.getRewardForLevel(communityId, newLevel);
      let rewardText = "";

      if (reward) {
        try {
          await withRetry(() =>
            rootServer.community.communityMemberRoles.add({
              communityRoleId: reward.role_id as CommunityRoleGuid,
              userIds: [userId as unknown as UserGuid],
            })
          );
          const roleMention = formatRoleMention(reward.role_id, reward.role_name);
          rewardText = `\n🌸 **New Role Unlocked:** ${roleMention} ✨`;
          logger.info(`Assigned level ${newLevel} role reward (${reward.role_name}) to user ${userId}`);
        } catch (roleErr) {
          logger.warn(`Could not assign level role reward to ${userId}`, { roleErr });
        }
      }

      // Announce level up if enabled
      if (settings.levelAnnouncements) {
        const userMention = formatUserMention(userId);
        const text = [
          `🌸 **MOCHI LEVEL UP!** 🌸`,
          CUTE_DIVIDER,
          `Yay, congratulations ${userMention}! (｡•̀ᴗ-)✧`,
          `✨ You blossomed to **Level ${newLevel}**! ✨${rewardText}`,
          SAKURA_DIVIDER,
          `*(◕ᴗ◕✿) Keep on chatting and smiling!*`,
        ].join("\n");

        try {
          await withRetry(() =>
            rootServer.community.channelMessages.create({
              channelId,
              content: text,
            })
          );
        } catch (msgErr) {
          logger.warn("Failed to send level up announcement message", { msgErr });
        }
      }
    }
  }
}

