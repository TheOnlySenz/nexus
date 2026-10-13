import {
  ChannelMessageReactionCreatedEvent,
  ChannelMessageReactionDeletedEvent,
  rootServer,
  CommunityRoleGuid,
} from "@rootsdk/server-bot";
import { ReactionRolesRepository } from "../../database/repositories/reaction-roles";
import { AchievementsModule } from "../achievements/achievements";
import { withRetry } from "../../core/rate-limiter";
import { Logger } from "../../core/logger";

const logger = new Logger("ReactionRolesModule");

export class ReactionRolesModule {
  constructor(
    private readonly reactionRolesRepo: ReactionRolesRepository,
    private readonly achievementsModule: AchievementsModule
  ) {}

  async handleReactionCreated(
    evt: ChannelMessageReactionCreatedEvent,
    communityId: string
  ): Promise<void> {
    const { messageId, shortcode, userId, channelId } = evt;
    if (!messageId || !shortcode || !userId) return;

    // Check achievement for first reaction
    await this.achievementsModule.checkAndUnlock(communityId, userId, "FIRST_REACTION", channelId);

    const binding = await this.reactionRolesRepo.getByMessageAndEmoji(
      communityId,
      messageId,
      shortcode
    );

    if (!binding) return;

    logger.info(`Assigning reaction role ${binding.role_id} to user ${userId} for emoji ${shortcode}`);
    try {
      await withRetry(() =>
        rootServer.community.communityMemberRoles.add({
          communityRoleId: binding.role_id as CommunityRoleGuid,
          userIds: [userId],
        })
      );
    } catch (err) {
      logger.error(`Failed to add reaction role ${binding.role_id} to user ${userId}`, err);
    }
  }

  async handleReactionDeleted(
    evt: ChannelMessageReactionDeletedEvent,
    communityId: string
  ): Promise<void> {
    const { messageId, shortcode, userId } = evt;
    if (!messageId || !shortcode || !userId) return;

    const binding = await this.reactionRolesRepo.getByMessageAndEmoji(
      communityId,
      messageId,
      shortcode
    );

    if (!binding) return;

    logger.info(`Removing reaction role ${binding.role_id} from user ${userId} for emoji ${shortcode}`);
    try {
      await withRetry(() =>
        rootServer.community.communityMemberRoles.remove({
          communityRoleId: binding.role_id as CommunityRoleGuid,
          userIds: [userId],
        })
      );
    } catch (err) {
      logger.error(`Failed to remove reaction role ${binding.role_id} from user ${userId}`, err);
    }
  }
}
