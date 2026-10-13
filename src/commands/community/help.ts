import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { CommandRouter } from "../../core/command-router";

export const helpCommand: Command = {
  name: "help",
  aliases: ["commands", "nexus"],
  description: "View the list of available NEXUS commands or command details.",
  usage: "!help [command]",
  category: "community",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 2000,
  execute: async (ctx: CommandContext) => {
    const router = ctx.services.commandRouter as CommandRouter;
    const targetCommandName = ctx.args[0]?.toLowerCase();

    if (targetCommandName) {
      const cmd = router.getCommand(targetCommandName);
      if (!cmd) {
        await ctx.replyError(`Command \`${ctx.prefix}${targetCommandName}\` was not found.`);
        return;
      }

      const permName = PermissionLevel[cmd.permission];
      const aliasesText = cmd.aliases && cmd.aliases.length > 0 ? cmd.aliases.map((a) => `\`!${a}\``).join(", ") : "None";

      await ctx.reply(
        `📖 **COMMAND INFO: !${cmd.name}**\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `**Description:** ${cmd.description}\n` +
        `**Usage:** \`${cmd.usage}\`\n` +
        `**Category:** \`${cmd.category}\`\n` +
        `**Required Permission:** \`${permName}\`\n` +
        `**Aliases:** ${aliasesText}`
      );
      return;
    }

    // Full categorized help menu
    const lines = [
      `🌐 **NEXUS COMMUNITY BOT**`,
      `━━━━━━━━━━━━━━━━━━`,
      `🛡️ **Moderation**`,
      `\`!warn <@user> <reason>\` • \`!warnings <@user>\` • \`!clearwarnings <@user>\``,
      `\`!kick <@user> [reason]\` • \`!ban <@user> [time] [reason]\` • \`!purge <count>\``,
      ``,
      `📈 **Leveling & Engagement**`,
      `\`!rank [@user]\` • \`!leaderboard\` • \`!rewards\``,
      ``,
      `🎭 **Role Automation**`,
      `\`!reactionrole <msgId> <emoji> <@role>\``,
      ``,
      `🎉 **Giveaways & Events**`,
      `\`!giveaway create <time> <winners> <prize>\` • \`!giveaway enter <id>\``,
      ``,
      `💰 **Virtual Economy**`,
      `\`!balance [@user]\` • \`!daily\` • \`!transfer <@user> <amount>\``,
      ``,
      `📊 **Community & Analytics**`,
      `\`!server\` • \`!user [@user]\` • \`!stats\` • \`!ping\``,
      ``,
      `⚙️ **Administration**`,
      `\`!settings\` • \`!settings set <key> <val>\``,
      `━━━━━━━━━━━━━━━━━━`,
      `Type \`!help <command>\` for detailed usage instructions.`,
    ];

    await ctx.reply(lines.join("\n"));
  },
};
