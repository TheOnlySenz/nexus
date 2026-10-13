import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { extractUserId, formatUserMention } from "../../utils/formatting";
import { WarningsRepository } from "../../database/repositories/warnings";

export const warningsCommand: Command = {
  name: "warnings",
  aliases: ["warnlist", "strikes"],
  description: "View the warning history for a community member.",
  usage: "!warnings <@user>",
  category: "moderation",
  permission: PermissionLevel.MODERATOR,
  cooldownMs: 2000,
  execute: async (ctx: CommandContext) => {
    const warningsRepo = ctx.services.warningsRepo as WarningsRepository;

    const targetUserId = ctx.args[0] ? extractUserId(ctx.args[0]) : ctx.authorId;
    if (!targetUserId) {
      await ctx.replyError("Invalid user specified. Usage: `!warnings <@user>`");
      return;
    }

    const communityId = ctx.message.communityId || "default";
    const warnings = await warningsRepo.getWarnings(communityId, targetUserId);
    const userMention = formatUserMention(targetUserId);

    if (warnings.length === 0) {
      await ctx.reply(`✅ ${userMention} has no recorded warnings in this community.`);
      return;
    }

    const list = warnings.slice(0, 10).map((w, i) => {
      const dateStr = w.created_at ? new Date(w.created_at).toLocaleDateString() : "N/A";
      return `**#${warnings.length - i}** [${dateStr}] Reason: *${w.reason}* (by \`${w.moderator_id}\`)`;
    });

    await ctx.reply(
      `🛡️ **WARNING HISTORY (${warnings.length})**\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `**Target User:** ${userMention} (\`${targetUserId}\`)\n\n` +
      list.join("\n")
    );
  },
};
