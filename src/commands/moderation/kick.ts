import { UserGuid } from "@rootsdk/server-bot";
import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { extractUserId, formatUserMention } from "../../utils/formatting";
import { ModerationModule } from "../../modules/moderation/moderation";
import { CommandSyntaxError } from "../../core/errors";

export const kickCommand: Command = {
  name: "kick",
  description: "Kick a member from the community.",
  usage: "!kick <@user> [reason]",
  category: "moderation",
  permission: PermissionLevel.MODERATOR,
  cooldownMs: 3000,
  execute: async (ctx: CommandContext) => {
    const modModule = ctx.services.moderationModule as ModerationModule;

    if (!ctx.args[0]) {
      throw new CommandSyntaxError("Missing user argument. Usage: `!kick <@user> [reason]`");
    }

    const targetUserId = extractUserId(ctx.args[0]);
    if (!targetUserId) {
      await ctx.replyError("Invalid user specified. Please mention a valid user or provide their ID.");
      return;
    }

    if (targetUserId === ctx.authorId) {
      await ctx.replyError("You cannot kick yourself.");
      return;
    }

    const reason = ctx.args.slice(1).join(" ") || "No reason provided by moderator.";
    const communityId = ctx.message.communityId || "default";

    await modModule.kickUser(
      communityId,
      targetUserId as UserGuid,
      ctx.authorId,
      reason
    );

    const userMention = formatUserMention(targetUserId);
    await ctx.reply(
      `👢 **MEMBER KICKED**\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `**User:** ${userMention} (\`${targetUserId}\`)\n` +
      `**Reason:** ${reason}\n` +
      `**Moderator:** ${formatUserMention(ctx.authorId, ctx.authorName)}`
    );
  },
};
