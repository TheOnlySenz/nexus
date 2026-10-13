import { rootServer } from "@rootsdk/server-bot";
import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { withRetry } from "../../core/rate-limiter";

export const serverCommand: Command = {
  name: "server",
  aliases: ["serverinfo", "communityinfo"],
  description: "Display information about the current Root community.",
  usage: "!server",
  category: "community",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 5000,
  execute: async (ctx: CommandContext) => {
    let memberCount = "N/A";
    let roleCount = "N/A";

    try {
      const members = await withRetry(() => rootServer.community.communityMembers.listAll());
      if (members) memberCount = members.length.toString();
    } catch {
      // Fallback
    }

    try {
      const roles = await withRetry(() => rootServer.community.communityRoles.list());
      if (roles) roleCount = roles.length.toString();
    } catch {
      // Fallback
    }

    const lines = [
      `🏛️ **COMMUNITY INFORMATION**`,
      `━━━━━━━━━━━━━━━━━━`,
      `**Community ID:** \`${ctx.message.communityId || "Current"}\``,
      `**Members:** ${memberCount}`,
      `**Roles Defined:** ${roleCount}`,
      `**Current Channel:** <#${ctx.channelId}>`,
      `**NEXUS Status:** Active & Monitoring`,
    ];

    await ctx.reply(lines.join("\n"));
  },
};
