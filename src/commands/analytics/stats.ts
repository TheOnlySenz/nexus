import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { AnalyticsModule } from "../../modules/analytics/analytics";
import { CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";

export const statsCommand: Command = {
  name: "stats",
  aliases: ["activity", "metrics", "analytics"],
  description: "View cozy community activity and engagement analytics.",
  usage: "!stats",
  category: "community",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 5000,
  execute: async (ctx: CommandContext) => {
    const analyticsModule = ctx.services.analyticsModule as AnalyticsModule;
    const communityId = ctx.message.communityId || "default";

    const stats = await analyticsModule.getCommunityStats(communityId);

    const lines = [
      `🌸 **MOCHI COMMUNITY SNAPSHOT** 🌸`,
      CUTE_DIVIDER,
      `🍡 **Cozy Members:** **${stats.memberCount > 0 ? stats.memberCount.toLocaleString() : "Active Community"}**`,
      `💬 **Messages (7d):** **${stats.weeklyMessages.toLocaleString()}** cheerful chats`,
      `✨ **Magic Commands:** **${stats.weeklyCommands.toLocaleString()}** casts`,
      `🛡️ **Peacekeeper Actions:** **${stats.weeklyModActions.toLocaleString()}** logs`,
      `🎀 **New Friends (7d):** **${stats.weeklyNewMembers.toLocaleString()}** blossoms`,
      SAKURA_DIVIDER,
      `*(◕ᴗ◕✿) Recorded with love by Mochi!*`,
    ];

    await ctx.reply(lines.join("\n"));
  },
};

