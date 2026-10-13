import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { extractUserId, extractUserName, formatUserMention } from "../../utils/formatting";
import { XpRepository, calculateXpRequiredForLevel } from "../../database/repositories/xp";
import { AchievementsRepository } from "../../database/repositories/achievements";

export const rankCommand: Command = {
  name: "rank",
  aliases: ["level", "profile"],
  description: "Display your or another member's NEXUS rank, level, and XP progression.",
  usage: "!rank [@user]",
  category: "leveling",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 3000,
  execute: async (ctx: CommandContext) => {
    const xpRepo = ctx.services.xpRepo as XpRepository;
    const achievementsRepo = ctx.services.achievementsRepo as AchievementsRepository;

    let targetUserId = ctx.authorId;
    let targetName = ctx.authorName;

    if (ctx.args[0]) {
      const extracted = extractUserId(ctx.args[0]);
      if (extracted) {
        targetUserId = extracted as any;
        targetName = extractUserName(ctx.args[0]) || "Member";
      }
    }


    const communityId = ctx.message.communityId || "default";
    const userRecord = await xpRepo.getUserXp(communityId, targetUserId);
    const userRank = await xpRepo.getUserRank(communityId, targetUserId);
    const achievements = await achievementsRepo.getUserAchievements(communityId, targetUserId);

    const xp = userRecord ? userRecord.xp : 0;
    const level = userRecord ? userRecord.level : 0;
    const messages = userRecord ? userRecord.message_count : 0;
    const rankStr = userRank > 0 ? `#${userRank}` : "Unranked";

    const currentLevelBaseXp = calculateXpRequiredForLevel(level);
    const nextLevelXp = calculateXpRequiredForLevel(level + 1);
    const progressInLevel = Math.max(0, xp - currentLevelBaseXp);
    const levelSpan = Math.max(1, nextLevelXp - currentLevelBaseXp);
    const percentage = Math.min(100, Math.floor((progressInLevel / levelSpan) * 100));

    // Progress bar display
    const filledBars = Math.floor(percentage / 10);
    const progressBar = "▰".repeat(filledBars) + "▱".repeat(10 - filledBars);

    const userMention = formatUserMention(targetUserId, targetName);

    const text = [
      `🌸 ˚｡⋆୨୧˚ **MOCHI PROFILE** ˚୨୧⋆｡˚ 🌸`,
      `─── ･ ｡ﾟ☆: *. 🍡 .* :☆ﾟ. ───`,
      `👤 **Mochi:** ${userMention}`,
      `🎀 **Level:** \`${level}\``,
      `🏆 **Leaderboard:** \`${rankStr}\``,
      `✨ **XP:** \`${xp.toLocaleString()} / ${nextLevelXp.toLocaleString()}\``,
      `🍡 **Progress:** \`[${progressBar}]\` **${percentage}%**`,
      `💬 **Chat Messages:** \`${messages.toLocaleString()}\``,
      `🍓 **Badges Unlocked:** \`${achievements.length}\``,
      `─── ･ ｡ﾟ☆: *. 🌸 .* :☆ﾟ. ───`,
    ].join("\n");

    await ctx.reply(text);
  },
};
