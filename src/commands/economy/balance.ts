import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { extractUserId, extractUserName, formatUserMention } from "../../utils/formatting";
import { EconomyModule } from "../../modules/economy/economy";
import { SettingsRepository } from "../../database/repositories/settings";

export const balanceCommand: Command = {
  name: "balance",
  aliases: ["bal", "wallet", "credits"],
  description: "Check your or another member's virtual credit balance.",
  usage: "!balance [@user]",
  category: "economy",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 3000,
  execute: async (ctx: CommandContext) => {
    const economyModule = ctx.services.economyModule as EconomyModule;
    const settingsRepo = ctx.services.settingsRepo as SettingsRepository;
    const communityId = ctx.message.communityId || "default";

    const settings = await settingsRepo.getSettings(communityId);
    let targetUserId = ctx.authorId;
    let targetName = ctx.authorName;

    if (ctx.args[0]) {
      const extracted = extractUserId(ctx.args[0]);
      if (extracted) {
        targetUserId = extracted as any;
        targetName = extractUserName(ctx.args[0]) || "Member";
      }
    }


    const bal = await economyModule.getBalance(communityId, targetUserId);
    const userMention = formatUserMention(targetUserId, targetName);

    await ctx.reply(
      `👛 ˚｡⋆୨୧˚ **SWEET MOCHI WALLET** ˚୨୧⋆｡˚ 🍡\n` +
      `─── ･ ｡ﾟ☆: *. 🌸 .* :☆ﾟ. ───\n` +
      `👤 **Mochi:** ${userMention}\n` +
      `🍡 **Pouch:** **${bal.toLocaleString()}** ${settings.currencySymbol} *(${settings.currencyName})*\n` +
      `─── ･ ｡ﾟ☆: *. 🌸 .* :☆ﾟ. ───\n` +
      `*Save up your treats or share them with friends! (｡♥‿♥｡)*`
    );
  },
};
