import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { EconomyRepository } from "../../database/repositories/economy";
import { SettingsRepository } from "../../database/repositories/settings";
import { formatUserMention, CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";

export const coinflipCommand: Command = {
  name: "coinflip",
  aliases: ["cf", "flip"],
  description: "Wager a few Mochi Bites on a cute lucky coin flip (heads or tails)!",
  usage: "!coinflip <amount> [heads/tails]",
  category: "games",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 3000,
  execute: async (ctx: CommandContext) => {
    const economyRepo = ctx.services.economyRepo as EconomyRepository;
    const settingsRepo = ctx.services.settingsRepo as SettingsRepository;
    const communityId = ctx.message.communityId || "default";

    if (!ctx.args[0]) {
      await ctx.reply("🌸 Please specify an amount to wager! Example: `!coinflip 25 heads` (*ˊᵕˋ*)");
      return;
    }

    const amount = parseInt(ctx.args[0], 10);
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply("🌸 Please enter a valid positive number of Mochi Bites to wager! (っ- ‸ - ς)");
      return;
    }

    if (amount > 10000) {
      await ctx.reply("🌸 The maximum wager limit is **10,000 Mochi Bites** per flip to keep things cozy! (◕ᴗ◕✿)");
      return;
    }

    const account = await economyRepo.getAccount(communityId, ctx.authorId);
    if (account.balance < amount) {
      await ctx.reply(
        `(ノ_<。) You don't have enough Mochi Bites! You only have **${account.balance}**, but tried to wager **${amount}**!`
      );
      return;
    }

    // Parse chosen side
    let choice = "heads";
    if (ctx.args[1]) {
      const rawChoice = ctx.args[1].toLowerCase();
      if (rawChoice === "t" || rawChoice === "tail" || rawChoice === "tails" || rawChoice === "dango") {
        choice = "tails";
      } else if (rawChoice === "h" || rawChoice === "head" || rawChoice === "heads" || rawChoice === "sakura" || rawChoice === "blossom") {
        choice = "heads";
      }
    }

    // 50/50 Coin Flip
    const outcome = Math.random() < 0.5 ? "heads" : "tails";
    const won = outcome === choice;

    const outcomeDisplay = outcome === "heads" ? "🌸 Heads (Sakura Blossom)" : "🍡 Tails (Sweet Dango)";
    const choiceDisplay = choice === "heads" ? "🌸 Heads" : "🍡 Tails";

    const settings = await settingsRepo.getSettings(communityId);
    const userMention = formatUserMention(ctx.authorId, ctx.authorName);

    if (won) {
      // Award winnings
      await economyRepo.addBalance(communityId, ctx.authorId, amount);
      const newBal = (await economyRepo.getAccount(communityId, ctx.authorId)).balance;

      const card = [
        `🪙 ˚｡⋆୨୧˚ **LUCKY COIN FLIP!** ˚୨୧⋆｡˚ ✨`,
        CUTE_DIVIDER,
        `*The golden sakura coin spun high into the air and landed on...*`,
        `👉 **${outcomeDisplay}**!`,
        "",
        `🎉 **YOU WON!** (*ˊᗜˋ*)੭* ੈ✩‧₊˚`,
        `Congratulations ${userMention}! You called **${choiceDisplay}** correctly!`,
        `🍡 **Winnings:** **+${amount}** ${settings.currencySymbol}`,
        `👛 **New Balance:** **${newBal.toLocaleString()}** ${settings.currencySymbol}`,
        SAKURA_DIVIDER,
        `*(｡•̀ᴗ-)✧ Feeling lucky today!*`,
      ].join("\n");

      await ctx.reply(card);
    } else {
      // Deduct loss
      await economyRepo.deductBalance(communityId, ctx.authorId, amount);
      const newBal = (await economyRepo.getAccount(communityId, ctx.authorId)).balance;

      const card = [
        `🪙 ˚｡⋆୨୧˚ **LUCKY COIN FLIP!** ˚୨୧⋆｡˚ 🍃`,
        CUTE_DIVIDER,
        `*The golden sakura coin spun high into the air and landed on...*`,
        `👉 **${outcomeDisplay}**!`,
        "",
        `(ノ_<。) **Oh no! Better luck next flip!**`,
        `${userMention}, you called **${choiceDisplay}**, but it landed on **${outcomeDisplay}**.`,
        `🍡 **Lost:** **-${amount}** ${settings.currencySymbol}`,
        `👛 **New Balance:** **${newBal.toLocaleString()}** ${settings.currencySymbol}`,
        SAKURA_DIVIDER,
        `*(っ- ‸ - ς) Have some tea and try again when you feel ready!*`,
      ].join("\n");

      await ctx.reply(card);
    }
  },
};
