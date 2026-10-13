import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { extractUserId, formatUserMention } from "../../utils/formatting";
import { ModerationModule } from "../../modules/moderation/moderation";
import { CommandSyntaxError } from "../../core/errors";

export const clearWarningsCommand: Command = {
  name: "clearwarnings",
  aliases: ["clearwarns", "resetwarnings"],
  description: "Clear all warning records for a community member.",
  usage: "!clearwarnings <@user>",
  category: "moderation",
  permission: PermissionLevel.MODERATOR,
  cooldownMs: 2000,
  execute: async (ctx: CommandContext) => {
    const modModule = ctx.services.moderationModule as ModerationModule;

    if (!ctx.args[0]) {
      throw new CommandSyntaxError("Missing user argument. Usage: `!clearwarnings <@user>`");
    }

    const targetUserId = extractUserId(ctx.args[0]);
    if (!targetUserId) {
      await ctx.replyError("Invalid user specified. Please mention a valid user or provide their ID.");
      return;
    }

    const communityId = ctx.message.communityId || "default";
    const cleared = await modModule.clearWarnings(communityId, targetUserId, ctx.authorId);
    const userMention = formatUserMention(targetUserId);

    if (cleared === 0) {
      await ctx.reply(`ℹ️ ${userMention} had no active warnings to clear.`);
      return;
    }

    await ctx.reply(`🧹 **Cleared ${cleared} warning(s)** for ${userMention}.`);
  },
};
