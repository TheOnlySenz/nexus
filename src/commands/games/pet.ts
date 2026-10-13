import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { PetModule } from "../../modules/games/pet";
import { CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";

export const petCommand: Command = {
  name: "pet",
  aliases: ["mochipet", "mascot", "pat"],
  description: "Cuddle, pet, or check on our community mascot Mochi-chan!",
  usage: "!pet [status]",
  category: "games",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 2000,
  execute: async (ctx: CommandContext) => {
    const petModule = ctx.services.petModule as PetModule;
    const communityId = ctx.message.communityId || "default";

    const sub = ctx.args[0]?.toLowerCase();

    if (sub === "status" || sub === "info" || sub === "stats") {
      const data = await petModule.getStatus(communityId);
      const card = [
        `🍡 ˚｡⋆୨୧˚ **COMMUNITY MASCOT: ${data.pet.name}** ˚୨୧⋆｡˚ 🌸`,
        CUTE_DIVIDER,
        `✨ **Level:** **${data.pet.level}** (XP: ${data.xpBar})`,
        `🍙 **Hunger:** ${data.hungerBar}`,
        `💕 **Happiness:** ${data.happinessBar}`,
        `🎀 **Current Mood:** ${data.mood}`,
        `🍬 **Total Community Treats Eaten:** **${data.pet.total_treats}**`,
        SAKURA_DIVIDER,
        `🌸 **Interact:**`,
        `• \`!pet\` — Give Mochi-chan warm headpats! (*ˊᗜˋ*)੭* ੈ✩‧₊˚`,
        `• \`!feed [item_id]\` — Feed Mochi-chan sweet bakery snacks! (๑>ᴗ<๑)`,
      ].join("\n");

      await ctx.reply(card);
      return;
    }

    // Default action: Headpat!
    const result = await petModule.pet(communityId, ctx.authorId);
    await ctx.reply(result.message);
  },
};

export const feedCommand: Command = {
  name: "feed",
  aliases: ["snack", "treat"],
  description: "Feed our community mascot Mochi-chan a sweet treat to level them up!",
  usage: "!feed [item_id]",
  category: "games",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 2000,
  execute: async (ctx: CommandContext) => {
    const petModule = ctx.services.petModule as PetModule;
    const communityId = ctx.message.communityId || "default";

    const itemId = ctx.args[0]?.toLowerCase();
    const result = await petModule.feed(communityId, ctx.authorId, itemId);

    await ctx.reply(result.message);
  },
};
