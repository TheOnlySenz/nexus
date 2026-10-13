import { UserGuid } from "@rootsdk/server-bot";
import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { extractUserId, formatUserMention, CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";
import { parseDuration } from "../../utils/time";
import { ModerationModule } from "../../modules/moderation/moderation";
import { CommandSyntaxError } from "../../core/errors";

export const banCommand: Command = {
  name: "ban",
  description: "Ban a member from the community with optional duration and reason.",
  usage: "!ban <@user> [duration: e.g. 7d] [reason]",
  category: "moderation",
  permission: PermissionLevel.ADMIN,
  cooldownMs: 3000,
  execute: async (ctx: CommandContext) => {
    const modModule = ctx.services.moderationModule as ModerationModule;

    if (!ctx.args[0]) {
      throw new CommandSyntaxError("Missing user argument. Usage: `!ban <@user> [duration] [reason]`");
    }

    const targetUserId = extractUserId(ctx.args[0]);
    if (!targetUserId) {
      await ctx.replyError("Invalid user specified. Please mention a valid user or provide their ID.");
      return;
    }

    if (targetUserId === ctx.authorId) {
      await ctx.replyError("You cannot ban yourself.");
      return;
    }

    let expiresAt: Date | undefined = undefined;
    let remainingArgs = ctx.args.slice(1);

    if (remainingArgs.length > 0) {
      const durationMs = parseDuration(remainingArgs[0]);
      if (durationMs !== null) {
        expiresAt = new Date(Date.now() + durationMs);
        remainingArgs = remainingArgs.slice(1);
      }
    }

    const reason = remainingArgs.join(" ") || "No reason provided by administrator.";
    const communityId = ctx.message.communityId || "default";

    await modModule.banUser(
      communityId,
      targetUserId as UserGuid,
      ctx.authorId,
      reason,
      expiresAt
    );

    const userMention = formatUserMention(targetUserId);
    const durationText = expiresAt ? `Temporary (Expires: ${expiresAt.toUTCString()})` : "Permanent";

    await ctx.reply(
      `🔨 **MEMBER REMOVED** 🔨\n` +
      `${CUTE_DIVIDER}\n` +
      `🌸 **Member:** ${userMention} (\`${targetUserId}\`)\n` +
      `⏳ **Duration:** ${durationText}\n` +
      `📝 **Reason:** ${reason}\n` +
      `🛡️ **Moderator:** ${formatUserMention(ctx.authorId, ctx.authorName)}\n` +
      `${SAKURA_DIVIDER}`
    );
  },
};

