import { rootServer, UserGuid } from "@rootsdk/server-bot";
import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { extractUserId, formatUserMention } from "../../utils/formatting";
import { XpRepository } from "../../database/repositories/xp";
import { WarningsRepository } from "../../database/repositories/warnings";
import { EconomyRepository } from "../../database/repositories/economy";
import { withRetry } from "../../core/rate-limiter";

export const userCommand: Command = {
  name: "user",
  aliases: ["userinfo", "whois"],
  description: "Display profile, membership, and activity information for a user.",
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
    let nickname = "Member";
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

    // 2. Fetch NEXUS records
    const xpRecord = await xpRepo.getUserXp(communityId, targetUserId);
    const warningCount = await warningsRepo.getWarningCount(communityId, targetUserId);
    const balance = await economyRepo.getBalance(communityId, targetUserId);

    const userMention = formatUserMention(targetUserId, nickname);

    const lines = [
      `👤 **MEMBER PROFILE**`,
      `━━━━━━━━━━━━━━━━━━`,
      `**User:** ${userMention}`,
      `**User ID:** \`${targetUserId}\``,
      `**Assigned Roles:** ${roleCount}`,
      `**Level:** ${xpRecord ? xpRecord.level : 0}`,
      `**XP:** ${xpRecord ? xpRecord.xp.toLocaleString() : 0}`,
      `**Messages:** ${xpRecord ? xpRecord.message_count.toLocaleString() : 0}`,
      `**Balance:** ${balance.toLocaleString()} ⬡`,
      `**Warnings:** ${warningCount}`,
    ];

    await ctx.reply(lines.join("\n"));
  },
};
