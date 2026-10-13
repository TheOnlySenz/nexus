import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { DatabaseManager } from "../database/db";
import { SettingsRepository } from "../database/repositories/settings";
import { WarningsRepository } from "../database/repositories/warnings";
import { XpRepository } from "../database/repositories/xp";
import { AchievementsRepository } from "../database/repositories/achievements";
import { ReactionRolesRepository } from "../database/repositories/reaction-roles";
import { GiveawaysRepository } from "../database/repositories/giveaways";
import { EconomyRepository } from "../database/repositories/economy";
import { AnalyticsRepository } from "../database/repositories/analytics";

import { CommandRouter } from "./command-router";
import { EventRouter } from "./event-router";
import { PermissionManager } from "./permissions";
import { Logger } from "./logger";

// Modules
import { ModerationModule } from "../modules/moderation/moderation";
import { AutomodModule } from "../modules/moderation/automod";
import { WelcomeModule } from "../modules/welcome/welcome";
import { LevelingModule } from "../modules/leveling/leveling";
import { AchievementsModule } from "../modules/achievements/achievements";
import { ReactionRolesModule } from "../modules/roles/reaction-roles";
import { GiveawaysModule } from "../modules/giveaways/giveaways";
import { EconomyModule } from "../modules/economy/economy";
import { AnalyticsModule } from "../modules/analytics/analytics";

// Commands
import { helpCommand } from "../commands/community/help";
import { pingCommand } from "../commands/community/ping";
import { serverCommand } from "../commands/community/server";
import { userCommand } from "../commands/community/user";

import { warnCommand } from "../commands/moderation/warn";
import { warningsCommand } from "../commands/moderation/warnings";
import { clearWarningsCommand } from "../commands/moderation/clearwarnings";
import { kickCommand } from "../commands/moderation/kick";
import { banCommand } from "../commands/moderation/ban";
import { purgeCommand } from "../commands/moderation/purge";

import { rankCommand } from "../commands/leveling/rank";
import { leaderboardCommand } from "../commands/leveling/leaderboard";
import { rewardsCommand } from "../commands/leveling/rewards";

import { reactionRoleCommand } from "../commands/automation/reactionrole";
import { giveawayCommand } from "../commands/automation/giveaway";

import { balanceCommand } from "../commands/economy/balance";
import { dailyCommand } from "../commands/economy/daily";
import { transferCommand } from "../commands/economy/transfer";

import { statsCommand } from "../commands/analytics/stats";
import { settingsCommand } from "../commands/admin/settings";

const logger = new Logger("NexusBot");

export class NexusBot {
  private dbManager!: DatabaseManager;
  private commandRouter!: CommandRouter;
  private eventRouter!: EventRouter;
  private permissionManager!: PermissionManager;

  // Repositories
  private settingsRepo!: SettingsRepository;
  private warningsRepo!: WarningsRepository;
  private xpRepo!: XpRepository;
  private achievementsRepo!: AchievementsRepository;
  private reactionRolesRepo!: ReactionRolesRepository;
  private giveawaysRepo!: GiveawaysRepository;
  private economyRepo!: EconomyRepository;
  private analyticsRepo!: AnalyticsRepository;

  // Modules
  private moderationModule!: ModerationModule;
  private automodModule!: AutomodModule;
  private welcomeModule!: WelcomeModule;
  private levelingModule!: LevelingModule;
  private achievementsModule!: AchievementsModule;
  private reactionRolesModule!: ReactionRolesModule;
  private giveawaysModule!: GiveawaysModule;
  private economyModule!: EconomyModule;
  private analyticsModule!: AnalyticsModule;

  async start(state: RootBotStartState): Promise<void> {
    logger.info("Initializing NEXUS bot for RootApp...", {
      communityId: state.communityId,
    });

    // 1. Initialize SQLite Database
    const sqlitePath =
      rootServer.dataStore.config.sqlite3?.filename || "./nexus.db";
    this.dbManager = new DatabaseManager(sqlitePath);
    await this.dbManager.initialize();

    // 2. Initialize Repositories
    this.settingsRepo = new SettingsRepository(this.dbManager);
    this.warningsRepo = new WarningsRepository(this.dbManager);
    this.xpRepo = new XpRepository(this.dbManager);
    this.achievementsRepo = new AchievementsRepository(this.dbManager);
    this.reactionRolesRepo = new ReactionRolesRepository(this.dbManager);
    this.giveawaysRepo = new GiveawaysRepository(this.dbManager);
    this.economyRepo = new EconomyRepository(this.dbManager);
    this.analyticsRepo = new AnalyticsRepository(this.dbManager);

    // 3. Initialize Core Managers
    this.permissionManager = new PermissionManager();
    this.commandRouter = new CommandRouter();

    // Seed community roles if provided in start state
    if (state.communityRoles) {
      this.permissionManager.setKnownRoles(state.communityRoles);
      logger.info(
        `Primed ${state.communityRoles.size} community roles into permission manager`
      );
    }

    // Resolve community details and owner
    try {
      if (rootServer?.community?.communities) {
        const community = await rootServer.community.communities.get();
        if (community) {
          logger.info(`Attached to community: "${community.name}" (${community.communityId})`);
          if (community.ownerUserId) {
            this.permissionManager.setOwnerId(community.ownerUserId);
            logger.info(`Community owner identified: ${community.ownerUserId}`);
          }
        }
      }
    } catch (commErr) {
      logger.warn("Could not query community info on startup", { commErr });
    }

    // Fetch live roles if available
    try {
      if (rootServer?.community?.communityRoles) {
        const roles = await rootServer.community.communityRoles.list();
        if (roles && roles.length > 0) {
          for (const r of roles) {
            this.permissionManager.addOrUpdateRole(r.id, r.name, r.communityPermission, r.channelPermission);
          }
          logger.info(`Loaded ${roles.length} live community roles`);
        }
      }
    } catch (roleErr) {
      // Fallback
    }


    // 4. Initialize Feature Modules
    this.analyticsModule = new AnalyticsModule(this.analyticsRepo);
    this.achievementsModule = new AchievementsModule(this.achievementsRepo, this.xpRepo);
    this.moderationModule = new ModerationModule(
      this.warningsRepo,
      this.settingsRepo,
      this.analyticsRepo
    );
    this.automodModule = new AutomodModule(
      this.settingsRepo,
      this.warningsRepo,
      this.analyticsRepo
    );
    this.welcomeModule = new WelcomeModule(this.settingsRepo, this.analyticsRepo);
    this.levelingModule = new LevelingModule(
      this.xpRepo,
      this.settingsRepo,
      this.achievementsModule
    );
    this.reactionRolesModule = new ReactionRolesModule(
      this.reactionRolesRepo,
      this.achievementsModule
    );
    this.giveawaysModule = new GiveawaysModule(this.giveawaysRepo);
    this.economyModule = new EconomyModule(
      this.economyRepo,
      this.settingsRepo,
      this.achievementsModule
    );

    // 5. Build Dependency Context for Commands
    const services: Record<string, unknown> = {
      commandRouter: this.commandRouter,
      permissionManager: this.permissionManager,
      settingsRepo: this.settingsRepo,
      warningsRepo: this.warningsRepo,
      xpRepo: this.xpRepo,
      achievementsRepo: this.achievementsRepo,
      reactionRolesRepo: this.reactionRolesRepo,
      giveawaysRepo: this.giveawaysRepo,
      economyRepo: this.economyRepo,
      analyticsRepo: this.analyticsRepo,
      moderationModule: this.moderationModule,
      automodModule: this.automodModule,
      welcomeModule: this.welcomeModule,
      levelingModule: this.levelingModule,
      achievementsModule: this.achievementsModule,
      reactionRolesModule: this.reactionRolesModule,
      giveawaysModule: this.giveawaysModule,
      economyModule: this.economyModule,
      analyticsModule: this.analyticsModule,
    };

    // 6. Register Commands
    this.registerCommands();

    // 7. Subscribe Event Router
    this.eventRouter = new EventRouter({
      commandRouter: this.commandRouter,
      permissionManager: this.permissionManager,
      settingsRepo: this.settingsRepo,
      automodModule: this.automodModule,
      levelingModule: this.levelingModule,
      welcomeModule: this.welcomeModule,
      reactionRolesModule: this.reactionRolesModule,
      giveawaysModule: this.giveawaysModule,
      analyticsModule: this.analyticsModule,
      services,
    });
    this.eventRouter.subscribe();

    // 8. Reconcile overdue state
    try {
      await this.giveawaysModule.reconcileActiveGiveaways();
    } catch (reconcileErr) {
      logger.error("Error reconciling active giveaways on startup", reconcileErr);
    }

    logger.info("NEXUS bot successfully started and ready!");
  }

  async stop(): Promise<void> {
    logger.info("Stopping NEXUS bot...");
    if (this.dbManager) {
      await this.dbManager.close();
    }
    logger.info("NEXUS bot gracefully stopped");
  }

  private registerCommands(): void {
    const commands = [
      // Community
      helpCommand,
      pingCommand,
      serverCommand,
      userCommand,

      // Moderation
      warnCommand,
      warningsCommand,
      clearWarningsCommand,
      kickCommand,
      banCommand,
      purgeCommand,

      // Leveling
      rankCommand,
      leaderboardCommand,
      rewardsCommand,

      // Automation
      reactionRoleCommand,
      giveawayCommand,

      // Economy
      balanceCommand,
      dailyCommand,
      transferCommand,

      // Analytics
      statsCommand,

      // Admin
      settingsCommand,
    ];

    for (const cmd of commands) {
      this.commandRouter.register(cmd);
    }

    logger.info(`Registered ${commands.length} commands with CommandRouter`);
  }
}
