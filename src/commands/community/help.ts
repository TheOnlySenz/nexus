import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { CommandRouter } from "../../core/command-router";

export const helpCommand: Command = {
  name: "help",
  aliases: ["commands", "mochi"],
  description: "View the list of available commands or details about a command.",
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
        await ctx.replyError(`🌸 Oh no! Command \`${ctx.prefix}${targetCommandName}\` was not found.`);
        return;
      }

      const permName = PermissionLevel[cmd.permission];
      const aliasesText = cmd.aliases && cmd.aliases.length > 0 ? cmd.aliases.map((a) => `\`!${a}\``).join(", ") : "None";

      await ctx.reply(
        `🌸 ˚｡⋆ **COMMAND INFO: !${cmd.name}** ⋆｡˚ 🌸\n` +
        `─── ･ ｡ﾟ☆: *. 🍡 .* :☆ﾟ. ───\n` +
        `📝 **Description:** ${cmd.description}\n` +
        `🎀 **Usage:** \`${cmd.usage}\`\n` +
        `📁 **Category:** \`${cmd.category}\`\n` +
        `🔒 **Required Level:** \`${permName}\`\n` +
        `✨ **Aliases:** ${aliasesText}`
      );
      return;
    }

    // Full categorized cute help menu
    const lines = [
      `🌸 ˚｡⋆୨୧˚ **M O C H I (もち)** ˚୨୧⋆｡˚ 🌸`,
      `─── ･ ｡ﾟ☆: *. 🍡 .* :☆ﾟ. ───`,
      `🍡 **General & Cozy**`,
      `╰ \`!help\` • \`!ping\` • \`!server\` • \`!user\` • \`!stats\``,

      ``,
      `🎀 **Engagement & Leveling**`,
      `╰ \`!rank\` • \`!leaderboard\` • \`!rewards\``,
      ``,
      `🍓 **Sweet Economy**`,
      `╰ \`!balance\` • \`!daily\` • \`!transfer\``,
      ``,
      `🎉 **Events & Surprises**`,
      `╰ \`!giveaway create\` • \`!giveaway enter\``,
      ``,
      `✨ **Role Automation**`,
      `╰ \`!reactionrole\``,
      ``,
      `🛡️ **Cozy Guard (Moderation)**`,
      `╰ \`!warn\` • \`!warnings\` • \`!clearwarnings\` • \`!kick\` • \`!ban\` • \`!purge\``,
      ``,
      `⚙️ **Community Settings**`,
      `╰ \`!settings\` • \`!settings set <key> <val>\``,
      `─── ･ ｡ﾟ☆: *. 🌸 .* :☆ﾟ. ───`,
      `*Type \`!help <command>\` for detailed usage instructions! (｡•̀ᴗ-)✧*`,
    ];

    await ctx.reply(lines.join("\n"));
  },
};
