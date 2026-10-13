import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { extractUserId, formatUserMention, CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";
import { EconomyModule } from "../../modules/economy/economy";
import { SettingsRepository } from "../../database/repositories/settings";
import { CommandSyntaxError } from "../../core/errors";

export const transferCommand: Command = {
  name: "transfer",
  aliases: ["pay", "givecredits", "send", "gift"],
  description: "Gift sweet treats to another community member.",
  usage: "!transfer <@user> <amount>",
  category: "economy",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 3000,
  execute: async (ctx: CommandContext) => {
    const economyModule = ctx.services.economyModule as EconomyModule;
    const settingsRepo = ctx.services.settingsRepo as SettingsRepository;
    const communityId = ctx.message.communityId || "default";

    const targetArg = ctx.args[0];
    const amountArg = parseInt(ctx.args[1], 10);

    if (!targetArg || isNaN(amountArg) || amountArg <= 0) {
      throw new CommandSyntaxError("Usage: `!transfer <@user> <amount>`\nExample: `!transfer @Alice 50`");
    }

    const targetUserId = extractUserId(targetArg);
    if (!targetUserId) {
      await ctx.replyError("Invalid recipient specified. Please mention a valid user or provide their ID.");
      return;
    }

    const settings = await settingsRepo.getSettings(communityId);
    const { newSenderBalance } = await economyModule.transfer(
      communityId,
      ctx.authorId,
      targetUserId,
      amountArg
    );

    const senderMention = formatUserMention(ctx.authorId, ctx.authorName);
    const recipientMention = formatUserMention(targetUserId);

    await ctx.reply(
      `🍡 **SWEET TREAT DELIVERED!** 🍡\n` +
      `${CUTE_DIVIDER}\n` +
      `🌸 ${senderMention} gifted **${amountArg.toLocaleString()}** ${settings.currencySymbol} to ${recipientMention}! (人´∀｀)\n` +
      `🎀 Your remaining balance: **${newSenderBalance.toLocaleString()}** ${settings.currencySymbol}\n` +
      `${SAKURA_DIVIDER}`
    );
  },
};

