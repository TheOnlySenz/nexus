import { PetRepository } from "../../database/repositories/pet";
import { ShopRepository } from "../../database/repositories/shop";
import { EconomyRepository } from "../../database/repositories/economy";
import { CommunityPetRecord } from "../../types/database";
import { CooldownManager } from "../../core/rate-limiter";
import { CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";

export interface PetStatusCardData {
  pet: CommunityPetRecord;
  mood: string;
  hungerBar: string;
  happinessBar: string;
  xpBar: string;
  nextLevelXp: number;
}

export class PetModule {
  private petCooldowns = new CooldownManager();

  constructor(
    private readonly petRepo: PetRepository,
    private readonly shopRepo: ShopRepository,
    private readonly economyRepo: EconomyRepository
  ) {}

  private makeBar(value: number, max: number, length = 10): string {
    const filled = Math.min(length, Math.max(0, Math.round((value / max) * length)));
    return "█".repeat(filled) + "░".repeat(length - filled);
  }

  async getStatus(communityId: string): Promise<PetStatusCardData> {
    const pet = await this.petRepo.getPet(communityId);
    const nextLevelXp = pet.level * 100;

    let mood = "Cozy & cheerful! (◕ᴗ◕✿)";
    const overall = (pet.hunger + pet.happiness) / 2;

    if (overall >= 80) {
      mood = "Super ecstatic & bouncing with joy! (*≧▽≦)ノ ✨";
    } else if (overall >= 50) {
      mood = "Content, purring, and warm! (*ˊᵕˋ*) 🌸";
    } else if (overall >= 30) {
      mood = "A little sleepy and craving cuddles... (っ- ‸ - ς)";
    } else {
      mood = "Tummy is rumbling! Longing for sweet treats! (ノ_<。)";
    }

    return {
      pet,
      mood,
      hungerBar: `[${this.makeBar(pet.hunger, 100)}] ${pet.hunger}%`,
      happinessBar: `[${this.makeBar(pet.happiness, 100)}] ${pet.happiness}%`,
      xpBar: `[${this.makeBar(pet.xp, nextLevelXp)}] ${pet.xp}/${nextLevelXp}`,
      nextLevelXp,
    };
  }

  async pet(
    communityId: string,
    userId: string
  ): Promise<{ success: boolean; message: string; leveledUp?: boolean; newLevel?: number }> {
    const cooldownKey = `pet:${communityId}:${userId}`;
    const { onCooldown, remainingMs } = this.petCooldowns.check(cooldownKey, 60 * 1000, true);

    if (onCooldown) {
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      return {
        success: false,
        message: `Mochi-chan is enjoying your recent headpats! Please wait **${remainingSeconds}s** before petting again! (*ˊᵕˋ*)`,
      };
    }

    const { pet, leveledUp } = await this.petRepo.petPet(communityId, 12, 10);

    const sounds = [
      "*sqkiiish squish* Mochi-chan wiggles happily in your hands! (*ˊᗜˋ*)੭* ੈ✩‧₊˚",
      "*purrr purrr* Mochi-chan nuzzles against your warm palm! (◕ᴗ◕✿)",
      "*soft boop* Mochi-chan closes its eyes in pure cozy bliss! ( ˘ ³˘)♥",
    ];
    const sound = sounds[Math.floor(Math.random() * sounds.length)];

    let msg = `🌸 **GENTLE HEADPAT!**\n${sound}\n💕 **Happiness:** +12% | ✨ **Pet XP:** +10`;
    if (leveledUp) {
      msg += `\n\n🎉 **MASCOT LEVEL UP!** Mochi-chan grew to **Level ${pet.level}**! (*≧▽≦)ノ`;
    }

    return { success: true, message: msg, leveledUp, newLevel: pet.level };
  }

  async feed(
    communityId: string,
    userId: string,
    itemId?: string
  ): Promise<{ success: boolean; message: string; leveledUp?: boolean; newLevel?: number }> {
    const cooldownKey = `feed:${communityId}:${userId}`;
    const { onCooldown, remainingMs } = this.petCooldowns.check(cooldownKey, 30 * 1000, true);

    if (onCooldown) {
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      return {
        success: false,
        message: `Mochi-chan is still chewing delightfully! Please wait **${remainingSeconds}s** before feeding again! (๑>ᴗ<๑)`,
      };
    }

    let hungerBoost = 20;
    let happinessBoost = 15;
    let xpBoost = 15;
    let treatName = "Sweet Dango Nibble 🍡";

    if (itemId) {
      const item = await this.shopRepo.getItem(itemId);
      if (!item) {
        return { success: false, message: `Item \`${itemId}\` does not exist in the Bakery!` };
      }

      if (item.type !== "snack") {
        return {
          success: false,
          message: `\`${item.name}\` is a collectible or booster, not an edible snack! Try feeding bakery snacks like \`sakura_tea\`, \`strawberry_daifuku\`, or \`rainbow_dango\`! (っ- ‸ - ς)`,
        };
      }

      const consumed = await this.shopRepo.consumeItemFromInventory(communityId, userId, itemId, 1);
      if (!consumed) {
        return {
          success: false,
          message: `You don't have any \`${item.name}\` in your inventory! Buy some at \`!shop\` first! (*ˊᵕˋ*)`,
        };
      }

      treatName = `${item.icon} ${item.name}`;
      hungerBoost = Math.max(20, Math.round(item.effect_value));
      happinessBoost = Math.max(15, Math.round(item.effect_value * 0.8));
      xpBoost = Math.max(20, Math.round(item.effect_value * 0.6));
    } else {
      // Feed basic snack: costs 10 bites
      const account = await this.economyRepo.getAccount(communityId, userId);
      if (account.balance < 10) {
        return {
          success: false,
          message: `You need at least **10 Mochi Bites** 🍡 to buy a basic treat for Mochi-chan! Use \`!daily\` to get some bites! (っ- ‸ - ς)`,
        };
      }
      await this.economyRepo.deductBalance(communityId, userId, 10);
    }

    const { pet, leveledUp } = await this.petRepo.feedPet(
      communityId,
      hungerBoost,
      happinessBoost,
      xpBoost
    );

    let msg = [
      `🍡 **YUMMY TREAT!** 🌸`,
      CUTE_DIVIDER,
      `You fed Mochi-chan **${treatName}**! (๑>ᴗ<๑) *nom nom nom*`,
      `🍙 **Hunger:** +${hungerBoost}% | 💕 **Happiness:** +${happinessBoost}% | ✨ **Pet XP:** +${xpBoost}`,
      SAKURA_DIVIDER,
      `*Total community treats eaten: ${pet.total_treats}*`,
    ].join("\n");

    if (leveledUp) {
      msg += `\n\n🎉 **COMMUNITY CELEBRATION!** Mochi-chan blossomed to **Level ${pet.level}**! (*≧▽≦)ノ 🌸✨`;
    }

    return { success: true, message: msg, leveledUp, newLevel: pet.level };
  }
}
