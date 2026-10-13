import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { ShopModule } from "../../modules/shop/shop";
import { extractUserId, extractUserName, formatUserMention, CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";

export const inventoryCommand: Command = {
  name: "inventory",
  aliases: ["inv", "bag", "backpack"],
  description: "View your collected sweets, items, and active XP boosters!",
  usage: "!inventory [@user]",
  category: "economy",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 3000,
  execute: async (ctx: CommandContext) => {
    const shopModule = ctx.services.shopModule as ShopModule;
    const communityId = ctx.message.communityId || "default";

    let targetUserId = ctx.authorId;
    let targetName = ctx.authorName;

    if (ctx.args[0]) {
      const extracted = extractUserId(ctx.args[0]);
      if (extracted) {
        targetUserId = extracted as any;
        targetName = extractUserName(ctx.args[0]) || "Member";
      }
    }

    const { items, activeBooster } = await shopModule.getUserInventory(communityId, targetUserId);
    const userMention = formatUserMention(targetUserId, targetName);

    const lines = [
      `🎒 ˚｡⋆୨୧˚ **SWEET BACKPACK & INVENTORY** ˚୨୧⋆｡˚ 🌸`,
      CUTE_DIVIDER,
      `👤 **Backpack Owner:** ${userMention}`,
      "",
    ];

    if (activeBooster) {
      const remainingMinutes = Math.max(
        0,
        Math.round((new Date(activeBooster.expires_at).getTime() - Date.now()) / (60 * 1000))
      );
      lines.push(
        `✨ **ACTIVE BOOSTER:**`,
        `• **${activeBooster.multiplier}x XP Booster** (Expires in ~**${remainingMinutes} min**)`,
        ""
      );
    }

    if (items.length === 0) {
      lines.push(
        `*Your backpack is currently empty! (っ- ‸ - ς)*`,
        `*Visit the \`!shop\` to pick up some delicious snacks and collectibles!*`
      );
    } else {
      lines.push(`🍡 **COLLECTED ITEMS:**`);
      for (const item of items) {
        const icon = item.itemDetails?.icon || "🍬";
        const name = item.itemDetails?.name || item.item_id;
        const desc = item.itemDetails?.description || "A cozy keepsake.";
        lines.push(`• ${icon} **${name}** x${item.quantity}\n  *ID: \`${item.item_id}\` — ${desc}*`);
      }
    }

    lines.push(
      SAKURA_DIVIDER,
      `💡 *Feed snacks to Mochi-chan with \`!feed <item_id>\`! (◕ᴗ◕✿)*`
    );

    await ctx.reply(lines.join("\n"));
  },
};
