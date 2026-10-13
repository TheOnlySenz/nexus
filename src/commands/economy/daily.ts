import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { formatUserMention } from "../../utils/formatting";
import { EconomyModule } from "../../modules/economy/economy";
import { SettingsRepository } from "../../database/repositories/settings";

export const dailyCommand: Command = {
  name: "daily",
  aliases: ["claimdaily", "dailyreward"],
  description: "Claim your daily virtual credits reward.",
  usage: "!daily",
  category: "economy",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 2000,
  execute: async (ctx: CommandContext) => {
    const economyModule = ctx.services.economyModule as EconomyModule;
    const settingsRepo = ctx.services.settingsRepo as SettingsRepository;
    const communityId = ctx.message.communityId || "default";

    const settings = await settingsRepo.getSettings(communityId);
    const result = await economyModule.claimDaily(communityId, ctx.authorId, ctx.channelId);
    const userMention = formatUserMention(ctx.authorId, ctx.authorName);

    if (!result.success) {
      await ctx.reply(
        `⏳ ${userMention} You have already claimed your daily reward!\n` +
        `Please return in **${result.remainingTimeText}**.\n` +
        `Current Balance: **${result.balance.toLocaleString()}** ${settings.currencySymbol}`
      );
      return;
    }

    await ctx.reply(
      `🎉 **DAILY REWARD CLAIMED!**\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Congratulations ${userMention}!\n` +
      `You received: **+${result.gained.toLocaleString()}** ${settings.currencySymbol}\n` +
      `New Balance: **${result.balance.toLocaleString()}** ${settings.currencySymbol}`
    );
  },
};
