import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { ShopModule } from "../../modules/shop/shop";
import { SettingsRepository } from "../../database/repositories/settings";
import { formatUserMention, CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";

export const buyCommand: Command = {
  name: "buy",
  aliases: ["purchase"],
  description: "Purchase sweet treats, collectibles, or boosters from the Mochi Bakery!",
  usage: "!buy <item_id> [quantity]",
  category: "economy",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 2000,
  execute: async (ctx: CommandContext) => {
    const shopModule = ctx.services.shopModule as ShopModule;
    const settingsRepo = ctx.services.settingsRepo as SettingsRepository;
    const communityId = ctx.message.communityId || "default";

    if (!ctx.args[0]) {
      await ctx.reply("🌸 Please specify an item to buy! Check the menu with `!shop`, then use `!buy <item_id>`! (*ˊᵕˋ*)");
      return;
    }

    const itemId = ctx.args[0].toLowerCase();
    const quantity = ctx.args[1] ? parseInt(ctx.args[1], 10) : 1;

    if (isNaN(quantity) || quantity <= 0) {
      await ctx.reply("🌸 Please enter a valid positive quantity to buy! (っ- ‸ - ς)");
      return;
    }

    const result = await shopModule.buyItem(communityId, ctx.authorId, itemId, quantity);
    if (!result.success) {
      await ctx.reply(`(ノ_<。) ${result.error}`);
      return;
    }

    const settings = await settingsRepo.getSettings(communityId);
    const userMention = formatUserMention(ctx.authorId, ctx.authorName);
    const item = result.item!;

    const lines = [
      `🛍️ **PURCHASE SUCCESSFUL!** 🌸 (*ˊᗜˋ*)੭* ੈ✩‧₊˚`,
      CUTE_DIVIDER,
      `Yay ${userMention}! You purchased:`,
      `✨ **${result.quantity}x ${item.icon} ${item.name}**`,
      `🍡 **Total Cost:** **${result.totalCost}** ${settings.currencySymbol}`,
      `👛 **Remaining Balance:** **${result.newBalance?.toLocaleString()}** ${settings.currencySymbol}`,
    ];

    if (result.boosterActivated) {
      lines.push(
        "",
        `✨ **MAGIC BOOSTER ACTIVATED!**`,
        `Your **2x XP Multiplier** is now active! Expiring: <t:${Math.floor(new Date(result.boosterExpiresAt!).getTime() / 1000)}:R>!`
      );
    } else if (item.type === "snack") {
      lines.push(
        "",
        `💡 *You can feed this snack to Mochi-chan with \`!feed ${item.id}\`!*`
      );
    }

    lines.push(SAKURA_DIVIDER, `*(◕ᴗ◕✿) View your full backpack with \`!inventory\`!*`);

    await ctx.reply(lines.join("\n"));
  },
};
