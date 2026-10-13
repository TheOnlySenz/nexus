import { rootServer, CommunityRoleGuid } from "@rootsdk/server-bot";
import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { extractRoleId, formatRoleMention, CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";
import { XpRepository } from "../../database/repositories/xp";
import { CommandSyntaxError } from "../../core/errors";

export const rewardsCommand: Command = {
  name: "rewards",
  aliases: ["levelroles", "levelrewards"],
  description: "View or configure role rewards unlocked at specific levels.",
  usage: "!rewards [add <level> <@role> | remove <level>]",
  category: "leveling",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 3000,
  execute: async (ctx: CommandContext) => {
    const xpRepo = ctx.services.xpRepo as XpRepository;
    const communityId = ctx.message.communityId || "default";
    const subCommand = ctx.args[0]?.toLowerCase();

    // 1. Add reward (Admin only)
    if (subCommand === "add") {
      if (ctx.permissionLevel < PermissionLevel.ADMIN) {
        await ctx.replyError("Only administrators can configure level rewards.");
        return;
      }

      const level = parseInt(ctx.args[1], 10);
      const roleArg = ctx.args[2];

      if (isNaN(level) || level <= 0 || !roleArg) {
        throw new CommandSyntaxError("Usage: `!rewards add <level> <@role>`");
      }

      const roleId = extractRoleId(roleArg);
      if (!roleId) {
        await ctx.replyError("Invalid role specified. Please mention a valid role or provide its ID.");
        return;
      }

      // Resolve role name
      let roleName = "Role";
      try {
        const role = await rootServer.community.communityRoles.get({ id: roleId as CommunityRoleGuid });
        if (role) roleName = role.name;
      } catch {
        // Fallback
      }

      await xpRepo.setLevelReward(communityId, level, roleId, roleName);
      const roleMention = formatRoleMention(roleId, roleName);
      await ctx.reply(`✨ Configured sweet reward: Reaching **Level ${level}** automatically gifts ${roleMention}! 🌸`);
      return;
    }

    // 2. Remove reward (Admin only)
    if (subCommand === "remove") {
      if (ctx.permissionLevel < PermissionLevel.ADMIN) {
        await ctx.replyError("Only administrators can configure level rewards.");
        return;
      }

      const level = parseInt(ctx.args[1], 10);
      if (isNaN(level)) {
        throw new CommandSyntaxError("Usage: `!rewards remove <level>`");
      }

      const removed = await xpRepo.removeLevelReward(communityId, level);
      if (!removed) {
        await ctx.replyError(`No reward was configured for Level ${level}.`);
        return;
      }

      await ctx.reply(`🗑️ Removed role reward for **Level ${level}**.`);
      return;
    }

    // 3. List rewards
    const rewards = await xpRepo.getLevelRewards(communityId);
    if (rewards.length === 0) {
      await ctx.reply(
        `🎖️ **LEVEL REWARDS** 🎖️\n${CUTE_DIVIDER}\nNo level role rewards are configured yet! Admins can set rewards with \`!rewards add <level> <@role>\`.\n${SAKURA_DIVIDER}`
      );
      return;
    }

    const rows = rewards.map((r) => {
      const mention = formatRoleMention(r.role_id, r.role_name);
      return `🌸 **Level ${r.level}** ➔ ${mention} ✨`;
    });

    await ctx.reply(
      `🎖️ **COZY LEVEL REWARDS** 🎖️\n${CUTE_DIVIDER}\n${rows.join("\n")}\n${SAKURA_DIVIDER}`
    );
  },
};

