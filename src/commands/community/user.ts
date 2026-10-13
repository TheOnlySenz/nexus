import { rootServer, UserGuid } from "@rootsdk/server-bot";
import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { extractUserId, extractUserName, formatUserMention, CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";
import { XpRepository } from "../../database/repositories/xp";
import { WarningsRepository } from "../../database/repositories/warnings";
import { EconomyRepository } from "../../database/repositories/economy";
import { withRetry } from "../../core/rate-limiter";

export const userCommand: Command = {
  name: "user",
  aliases: ["userinfo", "whois", "profile"],
  description: "Display cute profile, membership, and activity information for a user.",
  usage: "!user [@user]",
  category: "community",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 3000,
  execute: async (ctx: CommandContext) => {
    const xpRepo = ctx.services.xpRepo as XpRepository;
    const warningsRepo = ctx.services.warningsRepo as WarningsRepository;
    const economyRepo = ctx.services.economyRepo as EconomyRepository;

    let targetUserId = ctx.authorId;
    if (ctx.args[0]) {
      const extracted = extractUserId(ctx.args[0]);
      if (extracted) {
        targetUserId = extracted as UserGuid;
      }
    }

    const communityId = ctx.message.communityId || "default";

    // 1. Fetch Root member profile
    let nickname = (ctx.args[0] ? extractUserName(ctx.args[0]) : null) || (targetUserId === ctx.authorId ? ctx.authorName : "Member");
    let roleCount = 0;

    try {
      const member = await withRetry(() =>
        rootServer.community.communityMembers.get({ userId: targetUserId })
      );
      if (member) {
        nickname = member.nickname || nickname;
        if (member.communityRoleIds) {
          roleCount = member.communityRoleIds.length;
        }
      }
    } catch {
      // User might not be found on Root
    }

    // 2. Fetch records
    const xpRecord = await xpRepo.getUserXp(communityId, targetUserId);
    const warningCount = await warningsRepo.getWarningCount(communityId, targetUserId);
    const balance = await economyRepo.getBalance(communityId, targetUserId);

    const userMention = formatUserMention(targetUserId, nickname);

    const lines = [
      `🌸 **MOCHI MEMBER PROFILE** 🌸`,
      CUTE_DIVIDER,
      `🎀 **Friend:** ${userMention}`,
      `🏷️ **ID:** \`${targetUserId}\``,
      `✨ **Roles:** \`${roleCount} assigned\``,
      `⭐ **Level:** **${xpRecord ? xpRecord.level : 0}**`,
      `🌸 **Experience:** **${xpRecord ? xpRecord.xp.toLocaleString() : 0}** XP`,
      `💬 **Messages:** **${xpRecord ? xpRecord.message_count.toLocaleString() : 0}**`,
      `🍡 **Mochi Bites:** **${balance.toLocaleString()}** 🍡`,
      `🩹 **Warnings:** ${warningCount === 0 ? "✨ None! Perfect angel! ✨" : `\`${warningCount}\``}`,
      SAKURA_DIVIDER,
      `*(◕ᴗ◕✿) Keep shining in our cozy community!*`,
    ];

    await ctx.reply(lines.join("\n"));
  },
};

