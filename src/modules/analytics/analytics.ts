import { AnalyticsRepository } from "../../database/repositories/analytics";
import { rootServer } from "@rootsdk/server-bot";
import { Logger } from "../../core/logger";

const logger = new Logger("AnalyticsModule");

export class AnalyticsModule {
  constructor(private readonly analyticsRepo: AnalyticsRepository) {}

  async recordMessage(communityId: string): Promise<void> {
    await this.analyticsRepo.recordMessage(communityId);
  }

  async recordCommand(communityId: string): Promise<void> {
    await this.analyticsRepo.recordCommand(communityId);
  }

  async recordModerationAction(communityId: string): Promise<void> {
    await this.analyticsRepo.recordModerationAction(communityId);
  }

  async recordNewMember(communityId: string): Promise<void> {
    await this.analyticsRepo.recordNewMember(communityId);
  }

  async getCommunityStats(communityId: string): Promise<{
    memberCount: number;
    weeklyMessages: number;
    weeklyCommands: number;
    weeklyModActions: number;
    weeklyNewMembers: number;
  }> {
    let memberCount = 0;
    try {
      const all = await rootServer.community.communityMembers.listAll();
      if (all) {
        memberCount = all.length;
      }
    } catch (err) {
      logger.warn("Could not retrieve member count for stats", { err });
    }

    const summary = await this.analyticsRepo.getRecentSummary(communityId, 7);

    return {
      memberCount,
      weeklyMessages: summary.totalMessages,
      weeklyCommands: summary.totalCommands,
      weeklyModActions: summary.totalModActions,
      weeklyNewMembers: summary.totalNewMembers,
    };
  }
}
