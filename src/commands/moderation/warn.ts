import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { extractUserId, formatUserMention, CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";
import { ModerationModule } from "../../modules/moderation/moderation";
import { CommandSyntaxError } from "../../core/errors";

export const warnCommand: Command = {
  name: "warn",
  description: "Issue a gentle warning to a community member.",
  usage: "!warn <@user> <reason>",
  category: "moderation",
  permission: PermissionLevel.MODERATOR,
  cooldownMs: 2000,
  execute: async (ctx: CommandContext) => {
    const modModule = ctx.services.moderationModule as ModerationModule;

    if (!ctx.args[0] || !ctx.args[1]) {
      throw new CommandSyntaxError("Missing arguments. Usage: `!warn <@user> <reason>`", "!warn <@user> <reason>");
    }

    const targetUserId = extractUserId(ctx.args[0]);
    if (!targetUserId) {
      await ctx.replyError("Invalid user specified. Please mention a valid user or provide their ID.");
      return;
    }

    const reason = ctx.args.slice(1).join(" ");
    const communityId = ctx.message.communityId || "default";

    const { warningCount } = await modModule.warnUser(
      communityId,
      targetUserId,
      ctx.authorId,
      reason
    );

    const userMention = formatUserMention(targetUserId);

    await ctx.reply(
      `⚠️ **GENTLE WARNING ISSUED** ⚠️\n` +
      `${CUTE_DIVIDER}\n` +
      `🌸 **Friend:** ${userMention} (\`${targetUserId}\`)\n` +
      `🩹 **Warning Count:** #${warningCount}\n` +
      `📝 **Reason:** ${reason}\n` +
      `🛡️ **Moderator:** ${formatUserMention(ctx.authorId, ctx.authorName)}\n` +
      `${SAKURA_DIVIDER}\n` +
      `*Please remember to follow our community guidelines! (｡•́︿•̀｡)*`
    );
  },
};

