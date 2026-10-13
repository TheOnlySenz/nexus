import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { ShopModule } from "../../modules/shop/shop";
import { SettingsRepository } from "../../database/repositories/settings";
import { CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";

export const shopCommand: Command = {
  name: "shop",
  aliases: ["bakery", "store", "sweets"],
  description: "Browse the delicious Mochi Bakery menu of snacks, treats, collectibles, and boosters!",
  usage: "!shop",
  category: "economy",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 3000,
  execute: async (ctx: CommandContext) => {
    const shopModule = ctx.services.shopModule as ShopModule;
    const settingsRepo = ctx.services.settingsRepo as SettingsRepository;
    const communityId = ctx.message.communityId || "default";

    const settings = await settingsRepo.getSettings(communityId);
    const items = await shopModule.listItems();

    const snacks = items.filter((i) => i.type === "snack");
    const collectibles = items.filter((i) => i.type === "collectible");
    const boosters = items.filter((i) => i.type === "booster");

    const lines = [
      `🍡 ˚｡⋆୨୧˚ **MOCHI BAKERY & SWEET SHOP** ˚୨୧⋆｡˚ 🌸`,
      CUTE_DIVIDER,
      `*Welcome to the sweetest corner of the server! Spend your ${settings.currencyName} ${settings.currencySymbol} on cozy treats and collectibles!* (*ˊᵕˋ*)`,
      "",
      `🍵 **SWEET TREATS & EDIBLES** *(can feed Mochi-chan!)*`,
      ...snacks.map(
        (i) => `• ${i.icon} **${i.name}** — **${i.price}** ${settings.currencySymbol}\n  ID: \`${i.id}\` — *${i.description}*`
      ),
      "",
      `🧸 **COZY COLLECTIBLES**`,
      ...collectibles.map(
        (i) => `• ${i.icon} **${i.name}** — **${i.price}** ${settings.currencySymbol}\n  ID: \`${i.id}\` — *${i.description}*`
      ),
      "",
      `✨ **MAGIC BOOSTERS**`,
      ...boosters.map(
        (i) => `• ${i.icon} **${i.name}** — **${i.price}** ${settings.currencySymbol}\n  ID: \`${i.id}\` — *${i.description}*`
      ),
      SAKURA_DIVIDER,
      `🛒 **How to buy:** \`!buy <item_id> [amount]\` (e.g. \`!buy sakura_tea\`)`,
      `🎒 **View your backpack:** \`!inventory\``,
    ];

    await ctx.reply(lines.join("\n"));
  },
};
