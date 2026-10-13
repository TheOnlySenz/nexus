import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { AnalyticsModule } from "../../modules/analytics/analytics";

export const statsCommand: Command = {
  name: "stats",
  aliases: ["activity", "metrics"],
  description: "View community activity and engagement analytics.",
  usage: "!stats",
  category: "community",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 5000,
  execute: async (ctx: CommandContext) => {
    const analyticsModule = ctx.services.analyticsModule as AnalyticsModule;
    const communityId = ctx.message.communityId || "default";

    const stats = await analyticsModule.getCommunityStats(communityId);

    const lines = [
      `📊 **NEXUS COMMUNITY ANALYTICS**`,
      `━━━━━━━━━━━━━━━━━━`,
      `👥 **Total Members:** ${stats.memberCount > 0 ? stats.memberCount.toLocaleString() : "Active Community"}`,
      `💬 **Messages (Last 7 Days):** ${stats.weeklyMessages.toLocaleString()}`,
      `⚡ **Commands Executed:** ${stats.weeklyCommands.toLocaleString()}`,
      `🛡️ **Moderation Actions:** ${stats.weeklyModActions.toLocaleString()}`,
      `👋 **New Joins (Last 7 Days):** ${stats.weeklyNewMembers.toLocaleString()}`,
      `━━━━━━━━━━━━━━━━━━`,
      `*Metrics are recorded live by NEXUS.*`,
    ];

    await ctx.reply(lines.join("\n"));
  },
};
