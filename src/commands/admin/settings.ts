import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { SettingsRepository } from "../../database/repositories/settings";
import { extractChannelId, extractRoleId, formatChannelMention, formatRoleMention, CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";
import { CommandSyntaxError } from "../../core/errors";

export const settingsCommand: Command = {
  name: "settings",
  aliases: ["setup", "config"],
  description: "View and configure cozy community settings.",
  usage: "!settings [set <key> <value>]",
  category: "admin",
  permission: PermissionLevel.ADMIN,
  cooldownMs: 2000,
  execute: async (ctx: CommandContext) => {
    const settingsRepo = ctx.services.settingsRepo as SettingsRepository;
    const communityId = ctx.message.communityId || "default";
    const current = await settingsRepo.getSettings(communityId);

    const subCommand = ctx.args[0]?.toLowerCase();

    // 1. Updating a setting
    if (subCommand === "set") {
      const key = ctx.args[1]?.toLowerCase();
      const value = ctx.args.slice(2).join(" ");

      if (!key || !value) {
        throw new CommandSyntaxError(
          "Usage: `!settings set <key> <value>`\nAvailable keys: `prefix`, `welcome`, `welcomechannel`, `welcomemsg`, `autorole`, `xp`, `automod`, `modlog`, `economy`"
        );
      }

      switch (key) {
        case "prefix":
          current.prefix = value.trim();
          break;
        case "welcome":
          current.welcomeEnabled = value.toLowerCase() === "on" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
          break;
        case "welcomechannel": {
          const chId = extractChannelId(value);
          if (!chId) {
            await ctx.replyError("Invalid channel specified. Please mention a valid channel or provide its ID.");
            return;
          }
          current.welcomeChannelId = chId as any;
          break;
        }
        case "welcomemsg":
          current.welcomeMessage = value;
          break;
        case "autorole": {
          const rId = extractRoleId(value);
          if (!rId) {
            await ctx.replyError("Invalid role specified. Please mention a valid role or provide its ID.");
            return;
          }
          current.autoRoleId = rId as any;
          break;
        }
        case "xp":
          current.xpEnabled = value.toLowerCase() === "on" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
          break;
        case "automod":
          current.automodEnabled = value.toLowerCase() === "on" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
          break;
        case "modlog": {
          const chId = extractChannelId(value);
          if (!chId) {
            await ctx.replyError("Invalid channel specified. Please mention a valid channel or provide its ID.");
            return;
          }
          current.moderationLogChannelId = chId as any;
          break;
        }
        case "economy":
          current.economyEnabled = value.toLowerCase() === "on" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
          break;
        case "confessionchannel": {
          const chId = extractChannelId(value);
          if (!chId) {
            await ctx.replyError("Invalid channel specified. Please mention a valid channel or provide its ID.");
            return;
          }
          current.confessionChannelId = chId as any;
          break;
        }
        case "starboardchannel": {
          const chId = extractChannelId(value);
          if (!chId) {
            await ctx.replyError("Invalid channel specified. Please mention a valid channel or provide its ID.");
            return;
          }
          current.starboardChannelId = chId as any;
          break;
        }
        case "starboardthreshold": {
          const num = parseInt(value, 10);
          if (isNaN(num) || num <= 0) {
            await ctx.replyError("Please enter a valid positive number for starboard threshold (e.g. 3).");
            return;
          }
          current.starboardThreshold = num;
          break;
        }
        default:
          await ctx.replyError(`Unknown setting key \`${key}\`. Valid keys: \`prefix\`, \`welcome\`, \`welcomechannel\`, \`welcomemsg\`, \`autorole\`, \`xp\`, \`automod\`, \`modlog\`, \`economy\`, \`confessionchannel\`, \`starboardchannel\`, \`starboardthreshold\`.`);
          return;
        }

      await settingsRepo.saveSettings(current);
      await ctx.reply(`🌸 **Setting updated!** Set **${key}** to \`${value}\`. ✨`);
      return;
    }

    // 2. Displaying current settings dashboard
    const welcomeChStr = current.welcomeChannelId ? formatChannelMention(current.welcomeChannelId) : "None";
    const autoRoleStr = current.autoRoleId ? formatRoleMention(current.autoRoleId) : "None";
    const modLogStr = current.moderationLogChannelId ? formatChannelMention(current.moderationLogChannelId) : "None";
    const confessionChStr = current.confessionChannelId ? formatChannelMention(current.confessionChannelId) : "Current Channel";
    const starboardChStr = current.starboardChannelId ? formatChannelMention(current.starboardChannelId) : "None";

    const lines = [
      `🌸 **MOCHI COMMUNITY SETTINGS** 🌸`,
      CUTE_DIVIDER,
      `✨ **Prefix:** \`${current.prefix}\``,
      `🎀 **Welcome Greetings:** ${current.welcomeEnabled ? "🌸 ENABLED" : "⚪ DISABLED"} (Channel: ${welcomeChStr})`,
      `🎖️ **Auto-Role:** ${current.autoRoleId ? `🌸 ENABLED (${autoRoleStr})` : "⚪ DISABLED"}`,
      `⭐ **XP & Leveling:** ${current.xpEnabled ? "🌸 ENABLED" : "⚪ DISABLED"} (Cooldown: \`${current.xpCooldownSeconds}s\`)`,
      `🛡️ **Automod Guardian:** ${current.automodEnabled ? "🌸 ENABLED" : "⚪ DISABLED"}`,
      `📜 **Mod Log Channel:** ${modLogStr}`,
      `🍡 **Mochi Economy:** ${current.economyEnabled ? "🌸 ENABLED" : "⚪ DISABLED"} (Daily: \`${current.dailyRewardAmount} 🍡\`)`,
      `💌 **Confessions Channel:** ${confessionChStr}`,
      `⭐ **Starboard Channel:** ${starboardChStr} (Threshold: \`${current.starboardThreshold || 3} ⭐\`)`,
      SAKURA_DIVIDER,
      `*Configure with: \`!settings set <key> <value>\`*`,
    ];

    await ctx.reply(lines.join("\n"));
  },
};

