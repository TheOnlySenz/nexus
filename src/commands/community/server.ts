import { rootServer } from "@rootsdk/server-bot";
import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { withRetry } from "../../core/rate-limiter";
import { formatChannelMention, formatUserMention, CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";

export const serverCommand: Command = {
  name: "server",
  aliases: ["serverinfo", "communityinfo"],
  description: "Display information about the current Root community.",
  usage: "!server",
  category: "community",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 5000,
  execute: async (ctx: CommandContext) => {
    let communityName = "Cozy Community";
    let ownerText = "Owner";
    let memberCount = "N/A";
    let roleCount = "N/A";

    try {
      const comm = await withRetry(() => rootServer.community.communities.get());
      if (comm) {
        communityName = comm.name || communityName;
        if (comm.ownerUserId) {
          ownerText = formatUserMention(comm.ownerUserId);
        }
      }
    } catch {
      // Fallback
    }

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

    const currentChannel = formatChannelMention(ctx.channelId);

    const lines = [
      `🌸 ˚｡⋆୨୧˚ **${communityName.toUpperCase()}** ˚୨୧⋆｡˚ 🌸`,
      CUTE_DIVIDER,
      `🏡 **Community ID:** \`${ctx.message.communityId || "Current"}\``,
      `👑 **Owner:** ${ownerText}`,
      `👥 **Mochis (Members):** \`${memberCount}\``,
      `🎀 **Roles Defined:** \`${roleCount}\``,
      `💬 **Current Channel:** ${currentChannel}`,
      `🍡 **Mochi Status:** Cozy, active & caring! (◕ᴗ◕✿)`,
      SAKURA_DIVIDER,
    ];

    await ctx.reply(lines.join("\n"));
  },
};

