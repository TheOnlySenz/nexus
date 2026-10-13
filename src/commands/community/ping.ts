import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { CONSTANTS } from "../../config/defaults";

export const pingCommand: Command = {
  name: "ping",
  aliases: ["latency", "uptime"],
  description: "Check bot latency, uptime, and system status.",
  usage: "!ping",
  category: "community",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 3000,
  execute: async (ctx: CommandContext) => {
    const start = Date.now();
    const uptimeSeconds = Math.floor(process.uptime());
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);

    const memoryUsageMb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

    const uptimeStr = `${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`;
    const elapsed = Date.now() - start;

    await ctx.reply(
      `🏓 **PONG!**\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `⏱️ **Internal Latency:** \`${elapsed}ms\`\n` +
      `🤖 **Bot Version:** \`${CONSTANTS.VERSION}\`\n` +
      `⚡ **Uptime:** \`${uptimeStr}\`\n` +
      `💾 **Memory:** \`${memoryUsageMb} MB\`\n` +
      `🟢 **Status:** Operational (Root-native)`
    );
  },
};
