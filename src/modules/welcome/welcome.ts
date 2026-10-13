import { CommunityJoinedEvent, rootServer } from "@rootsdk/server-bot";
import { SettingsRepository } from "../../database/repositories/settings";
import { AnalyticsRepository } from "../../database/repositories/analytics";
import { formatUserMention } from "../../utils/formatting";
import { withRetry } from "../../core/rate-limiter";
import { Logger } from "../../core/logger";

const logger = new Logger("WelcomeModule");

export class WelcomeModule {
  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly analyticsRepo: AnalyticsRepository
  ) {}

  async handleMemberJoined(evt: CommunityJoinedEvent): Promise<void> {
    const communityId = evt.communityId;
    const userId = evt.userId;

    try {
      const settings = await this.settingsRepo.getSettings(communityId);
      await this.analyticsRepo.recordNewMember(communityId);

      // Fetch member information to get display name
      let displayName = "New Member";
      try {
        const member = await rootServer.community.communityMembers.get({ userId });
        if (member?.nickname) {
          displayName = member.nickname;
        }
      } catch (err) {
        logger.warn(`Could not resolve member nickname for ${userId}`, { err });
      }

      // 1. Post Welcome message if enabled and channel configured
      if (settings.welcomeEnabled && settings.welcomeChannelId) {
        let memberCount = "unknown";
        try {
          const allMembers = await rootServer.community.communityMembers.listAll();
          if (allMembers) {
            memberCount = allMembers.length.toString();
          }
        } catch {
          // Fallback if listAll not permitted or fails
        }

        const userMention = formatUserMention(userId, displayName);
        const text = settings.welcomeMessage
          .replace(/{user}/g, userMention)
          .replace(/{memberCount}/g, memberCount);

        try {
          await withRetry(() =>
            rootServer.community.channelMessages.create({
              channelId: settings.welcomeChannelId!,
              content: text,
            })
          );
          logger.info(`Sent welcome message for member ${userId} in channel ${settings.welcomeChannelId}`);
        } catch (msgErr) {
          logger.error(`Failed to post welcome message for ${userId}`, msgErr);
        }
      }

      // 2. Assign Auto-Role if configured
      if (settings.autoRoleId) {
        try {
          await withRetry(() =>
            rootServer.community.communityMemberRoles.add({
              communityRoleId: settings.autoRoleId!,
              userIds: [userId],
            })
          );
          logger.info(`Assigned auto-role ${settings.autoRoleId} to member ${userId}`);
        } catch (roleErr) {
          logger.error(`Failed to assign auto-role ${settings.autoRoleId} to ${userId}`, roleErr);
        }
      }
    } catch (err) {
      logger.error(`Error in welcome module for ${userId}`, err);
    }
  }
}
