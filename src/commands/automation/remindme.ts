import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { RemindersModule } from "../../modules/reminders/reminders";
import { parseDuration, formatDuration } from "../../utils/time";
import { formatUserMention, CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";

export const remindmeCommand: Command = {
  name: "remindme",
  aliases: ["remind", "timer", "reminder"],
  description: "Schedule a friendly reminder or timer with Mochi-chan!",
  usage: "!remindme <duration> <message>",
  category: "automation",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 3000,
  execute: async (ctx: CommandContext) => {
    const remindersModule = ctx.services.remindersModule as RemindersModule;
    const communityId = ctx.message.communityId || "default";

    if (!ctx.args[0] || !ctx.args[1]) {
      await ctx.reply(
        `🌸 **How to set a reminder:**\n` +
        `\`!remindme <duration> <reminder note>\`\n\n` +
        `*Examples:*\n` +
        `• \`!remindme 30m Take a cozy stretch break\`\n` +
        `• \`!remindme 2h Drink some warm sakura tea\`\n` +
        `• \`!remindme 1d Water the cherry blossom plants\` (*ˊᵕˋ*)`
      );
      return;
    }

    const durationMs = parseDuration(ctx.args[0]);
    if (!durationMs || durationMs < 5000) {
      await ctx.reply("🌸 Please specify a valid duration of at least 5 seconds (e.g. `10s`, `15m`, `2h`, `1d`)! (っ- ‸ - ς)");
      return;
    }

    const reminderMessage = ctx.args.slice(1).join(" ");
    const { remindAt } = await remindersModule.createReminder(
      communityId,
      ctx.channelId,
      ctx.authorId,
      reminderMessage,
      durationMs
    );

    const userMention = formatUserMention(ctx.authorId, ctx.authorName);
    const humanDuration = formatDuration(durationMs);

    const card = [
      `⏰ ˚｡⋆୨୧˚ **REMINDER SCHEDULED!** ˚୨୧⋆｡˚ 🌸`,
      CUTE_DIVIDER,
      `All set ${userMention}! I will gently remind you in **${humanDuration}**:`,
      `> "${reminderMessage}"`,
      SAKURA_DIVIDER,
      `🌸 **Scheduled for:** <t:${Math.floor(remindAt.getTime() / 1000)}:F> *(<t:${Math.floor(remindAt.getTime() / 1000)}:R>)*`,
      `*(◕ᴗ◕✿) Rest easy, Mochi won't forget!*`,
    ].join("\n");

    await ctx.reply(card);
  },
};
