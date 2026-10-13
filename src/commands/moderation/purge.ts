import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { ModerationModule } from "../../modules/moderation/moderation";
import { CommandSyntaxError } from "../../core/errors";

export const purgeCommand: Command = {
  name: "purge",
  aliases: ["clear", "cleanmessages"],
  description: "Delete recent messages in the current channel.",
  usage: "!purge <count: 1-50>",
  category: "moderation",
  permission: PermissionLevel.MODERATOR,
  cooldownMs: 5000,
  execute: async (ctx: CommandContext) => {
    const modModule = ctx.services.moderationModule as ModerationModule;

    const count = parseInt(ctx.args[0], 10);
    if (isNaN(count) || count < 1 || count > 50) {
      throw new CommandSyntaxError("Please specify a valid message count between 1 and 50. Usage: `!purge <count>`");
    }

    const communityId = ctx.message.communityId || "default";
    const deletedCount = await modModule.purgeMessages(
      communityId,
      ctx.channelId,
      count,
      ctx.authorId
    );

    await ctx.reply(`🧹 **All tidy!** Swept away **${deletedCount}** message(s) from this channel! ✨`);
  },
};

