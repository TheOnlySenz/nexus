import { rootServer, CommunityRoleGuid, MessageGuid } from "@rootsdk/server-bot";
import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { extractRoleId, formatRoleMention } from "../../utils/formatting";
import { ReactionRolesRepository } from "../../database/repositories/reaction-roles";
import { CommandSyntaxError } from "../../core/errors";
import { withRetry } from "../../core/rate-limiter";

export const reactionRoleCommand: Command = {
  name: "reactionrole",
  aliases: ["rr", "addreactionrole"],
  description: "Bind a reaction emoji to a role on a specific message.",
  usage: "!reactionrole <messageId> <emoji> <@role>",
  category: "automation",
  permission: PermissionLevel.ADMIN,
  cooldownMs: 3000,
  execute: async (ctx: CommandContext) => {
    const rrRepo = ctx.services.reactionRolesRepo as ReactionRolesRepository;

    const messageId = ctx.args[0] as MessageGuid;
    const emoji = ctx.args[1];
    const roleArg = ctx.args[2];

    if (!messageId || !emoji || !roleArg) {
      throw new CommandSyntaxError(
        "Usage: `!reactionrole <messageId> <emoji> <@role>`\nExample: `!reactionrole msg_123 :star: @VIP`"
      );
    }

    const roleId = extractRoleId(roleArg);
    if (!roleId) {
      await ctx.replyError("Invalid role specified. Please mention a valid role or provide its ID.");
      return;
    }

    // Normalize emoji shortcode (ensure enclosed in colons if standard name)
    const shortcode = emoji.startsWith(":") && emoji.endsWith(":") ? emoji : `:${emoji}:`;
    const communityId = ctx.message.communityId || "default";

    // 1. Verify and add the reaction to the target message
    try {
      await withRetry(() =>
        rootServer.community.channelMessages.reactionCreate({
          channelId: ctx.channelId,
          messageId,
          shortcode,
        })
      );
    } catch (reactionErr) {
      // If message is in another channel or doesn't exist, we still allow binding or warn
    }

    // 2. Persist binding
    const record = await rrRepo.create(
      communityId,
      messageId,
      ctx.channelId,
      shortcode,
      roleId,
      ctx.authorId
    );

    const roleMention = formatRoleMention(roleId);
    await ctx.reply(
      `🎭 **REACTION ROLE CONFIGURED**\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `**Message ID:** \`${messageId}\`\n` +
      `**Reaction:** ${shortcode}\n` +
      `**Role Granted:** ${roleMention}\n` +
      `**Binding ID:** \`${record.id}\`\n\n` +
      `Members reacting with ${shortcode} will receive ${roleMention}. Removing their reaction will revoke the role.`
    );
  },
};
