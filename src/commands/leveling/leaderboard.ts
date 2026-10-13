import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { formatUserMention } from "../../utils/formatting";
import { XpRepository } from "../../database/repositories/xp";

export const leaderboardCommand: Command = {
  name: "leaderboard",
  aliases: ["top", "lb"],
  description: "Display the top community members by XP and Level.",
  usage: "!leaderboard",
  category: "leveling",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 5000,
  execute: async (ctx: CommandContext) => {
    const xpRepo = ctx.services.xpRepo as XpRepository;
    const communityId = ctx.message.communityId || "default";

    const topUsers = await xpRepo.getLeaderboard(communityId, 10, 0);

    if (topUsers.length === 0) {
      await ctx.reply("📊 No members have earned XP yet. Start chatting to climb the leaderboard!");
      return;
    }

    const medals = ["🥇", "🥈", "🥉"];
    const rows = topUsers.map((u, i) => {
      const medalOrRank = i < 3 ? medals[i] : `**#${i + 1}**`;
      const mention = formatUserMention(u.user_id);
      return `${medalOrRank} ${mention} — **Level ${u.level}** (${u.xp.toLocaleString()} XP, ${u.message_count.toLocaleString()} msgs)`;
    });

    const text = [
      `🏆 **NEXUS COMMUNITY LEADERBOARD**`,
      `━━━━━━━━━━━━━━━━━━`,
      ...rows,
      `━━━━━━━━━━━━━━━━━━`,
      `Keep participating to earn XP and level up!`,
    ].join("\n");

    await ctx.reply(text);
  },
};
