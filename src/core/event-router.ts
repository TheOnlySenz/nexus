import {
  rootServer,
  MessageType,
  ChannelMessageCreatedEvent,
  ChannelMessageEditedEvent,
  ChannelMessageDeletedEvent,
  ChannelMessageReactionCreatedEvent,
  ChannelMessageReactionDeletedEvent,
  CommunityJoinedEvent,
  CommunityLeaveEvent,
  CommunityRoleCreatedEvent,
  CommunityRoleEditedEvent,
  CommunityRoleDeletedEvent,
  JobData,
  ChannelMessageEvent,
  CommunityEvent,
  CommunityRoleEvent,
  JobScheduleEvent,
  GlobalSettingsUpdateEvent,
} from "@rootsdk/server-bot";
import { CommandRouter } from "./command-router";
import { PermissionManager, PermissionLevel } from "./permissions";
import { SettingsRepository } from "../database/repositories/settings";
import { AutomodModule } from "../modules/moderation/automod";
import { LevelingModule } from "../modules/leveling/leveling";
import { WelcomeModule } from "../modules/welcome/welcome";
import { ReactionRolesModule } from "../modules/roles/reaction-roles";
import { GiveawaysModule } from "../modules/giveaways/giveaways";
import { AnalyticsModule } from "../modules/analytics/analytics";
import { CommandContext } from "../types/commands";
import { withRetry } from "./rate-limiter";
import { Logger } from "./logger";

const logger = new Logger("EventRouter");

export interface EventRouterDependencies {
  commandRouter: CommandRouter;
  permissionManager: PermissionManager;
  settingsRepo: SettingsRepository;
  automodModule: AutomodModule;
  levelingModule: LevelingModule;
  welcomeModule: WelcomeModule;
  reactionRolesModule: ReactionRolesModule;
  giveawaysModule: GiveawaysModule;
  analyticsModule: AnalyticsModule;
  services: Record<string, unknown>;
}

export class EventRouter {
  constructor(private readonly deps: EventRouterDependencies) {}

  subscribe(): void {
    logger.info("Registering Root event listeners...");

    // 1. Channel Messages
    rootServer.community.channelMessages.on(
      ChannelMessageEvent.ChannelMessageCreated,
      this.onMessageCreated.bind(this)
    );

    rootServer.community.channelMessages.on(
      ChannelMessageEvent.ChannelMessageReactionCreated,
      this.onReactionCreated.bind(this)
    );

    rootServer.community.channelMessages.on(
      ChannelMessageEvent.ChannelMessageReactionDeleted,
      this.onReactionDeleted.bind(this)
    );

    // 2. Communities (Member join / leave)
    rootServer.community.communities.on(
      CommunityEvent.CommunityJoined,
      this.onMemberJoined.bind(this)
    );

    // 3. Roles
    rootServer.community.communityRoles.on(
      CommunityRoleEvent.CommunityRoleCreated,
      (evt: CommunityRoleCreatedEvent) => {
        if (evt.id && evt.name) {
          this.deps.permissionManager.addOrUpdateRole(evt.id, evt.name);
        }
      }
    );

    rootServer.community.communityRoles.on(
      CommunityRoleEvent.CommunityRoleEdited,
      (evt: CommunityRoleEditedEvent) => {
        if (evt.id && evt.name) {
          this.deps.permissionManager.addOrUpdateRole(evt.id, evt.name);
        }
      }
    );

    rootServer.community.communityRoles.on(
      CommunityRoleEvent.CommunityRoleDeleted,
      (evt: CommunityRoleDeletedEvent) => {
        if (evt.communityRoleId) {
          this.deps.permissionManager.removeRole(evt.communityRoleId);
        }
      }
    );

    // 4. Job Scheduler
    if (rootServer.jobScheduler) {
      rootServer.jobScheduler.on(JobScheduleEvent.Job, this.onJob.bind(this));
      rootServer.jobScheduler.on(JobScheduleEvent.JobMissed, this.onJob.bind(this));
    }

    // 5. Global Settings live updates
    if (rootServer.globalSettings) {
      rootServer.globalSettings.on("update", (evt: GlobalSettingsUpdateEvent) => {
        logger.info("Received GlobalSettings update from Root client UI");
      });
    }

    logger.info("All Root event listeners registered successfully");
  }

  private async onMessageCreated(evt: ChannelMessageCreatedEvent): Promise<void> {
    // A. Ignore Root system messages
    if (evt.messageType === MessageType.System) return;

    // B. Ignore empty messages or messages without authors
    if (!evt.messageContent || !evt.userId) return;

    const communityId = evt.communityId || "default";

    // C. Run Automod check
    const automodTriggered = await this.deps.automodModule.processMessage(evt, communityId);
    if (automodTriggered) {
      // Message was deleted due to violation; cease further processing
      return;
    }

    // D. Analytics message tracking
    await this.deps.analyticsModule.recordMessage(communityId);

    // E. Command resolution
    const settings = await this.deps.settingsRepo.getSettings(communityId);
    const prefix = settings.prefix || "!";

    if (evt.messageContent.startsWith(prefix)) {
      await this.handleCommand(evt, communityId, prefix);
    } else {
      // F. Regular message: award XP
      await this.deps.levelingModule.processMessageXp(communityId, evt.userId, evt.channelId);
    }
  }

  private async handleCommand(
    evt: ChannelMessageCreatedEvent,
    communityId: string,
    prefix: string
  ): Promise<void> {
    const raw = evt.messageContent!.substring(prefix.length).trim();
    if (!raw) return;

    const parts = raw.split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);
    const rawArgs = raw.substring(parts[0].length).trim();

    // Check user permissions
    let memberRoles: any[] = [];
    let isGlobalAdminOrMod = false;

    // Check manifest globalSettings roleOrMember
    if (rootServer.globalSettings) {
      try {
        const modGroup = (rootServer.globalSettings as any)?.nexus_admin?.moderators;
        if (modGroup && typeof modGroup.isMember === "function") {
          isGlobalAdminOrMod = await modGroup.isMember({ userId: evt.userId });
        }
      } catch {
        // Fallback
      }
    }

    // Fetch user member profile for role IDs
    try {
      const member = await rootServer.community.communityMembers.get({ userId: evt.userId });
      if (member?.communityRoleIds) {
        memberRoles = member.communityRoleIds;
      }
    } catch {
      // Fallback
    }

    // Check owner status
    let isOwner = false;
    if (this.deps.permissionManager.getOwnerId()) {
      isOwner = this.deps.permissionManager.getOwnerId() === evt.userId;
    }

    const permissionLevel = await this.deps.permissionManager.resolvePermissionLevel(
      {
        userId: evt.userId,
        communityId,
        memberRoles,
        isOwner,
      },
      isGlobalAdminOrMod
    );


    // Resolve author name from referenceMaps or fallback
    let authorName = "Member";
    if (evt.referenceMaps?.users) {
      const matched = evt.referenceMaps.users.find((u) => u.userId === evt.userId);
      if (matched) authorName = matched.name;
    }

    const context: CommandContext = {
      message: evt,
      channelId: evt.channelId,
      authorId: evt.userId,
      authorName,
      args,
      rawArgs,
      prefix,
      permissionLevel,
      services: this.deps.services,
      reply: async (content: string) => {
        return withRetry(() =>
          rootServer.community.channelMessages.create({
            channelId: evt.channelId,
            content,
          })
        );
      },
      replyError: async (errorText: string) => {
        await withRetry(() =>
          rootServer.community.channelMessages.create({
            channelId: evt.channelId,
            content: errorText,
          })
        );
      },
    };

    const executed = await this.deps.commandRouter.execute(context, commandName);
    if (executed) {
      await this.deps.analyticsModule.recordCommand(communityId);
    }
  }

  private async onReactionCreated(evt: ChannelMessageReactionCreatedEvent): Promise<void> {
    const communityId = evt.communityId || "default";
    await this.deps.reactionRolesModule.handleReactionCreated(evt, communityId);
  }

  private async onReactionDeleted(evt: ChannelMessageReactionDeletedEvent): Promise<void> {
    const communityId = evt.communityId || "default";
    await this.deps.reactionRolesModule.handleReactionDeleted(evt, communityId);
  }

  private async onMemberJoined(evt: CommunityJoinedEvent): Promise<void> {
    await this.deps.welcomeModule.handleMemberJoined(evt);
  }

  private async onJob(data: JobData): Promise<void> {
    logger.info(`Root JobScheduler event fired: resourceId=${data.resourceId}, tag=${data.tag}`);
    await this.deps.giveawaysModule.handleJobEvent(data);
  }
}
