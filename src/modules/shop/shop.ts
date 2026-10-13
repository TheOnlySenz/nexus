import { ShopRepository } from "../../database/repositories/shop";
import { EconomyRepository } from "../../database/repositories/economy";
import { ShopItemRecord, UserInventoryRecord, ActiveBoosterRecord } from "../../types/database";
import { Logger } from "../../core/logger";

const logger = new Logger("ShopModule");

export interface BuyResult {
  success: boolean;
  item?: ShopItemRecord;
  quantity?: number;
  totalCost?: number;
  newBalance?: number;
  boosterActivated?: boolean;
  boosterExpiresAt?: string;
  error?: string;
}

export class ShopModule {
  constructor(
    private readonly shopRepo: ShopRepository,
    private readonly economyRepo: EconomyRepository
  ) {}

  async listItems(): Promise<ShopItemRecord[]> {
    return this.shopRepo.getItems();
  }

  async getUserInventory(communityId: string, userId: string): Promise<{
    items: (UserInventoryRecord & { itemDetails?: ShopItemRecord })[];
    activeBooster: ActiveBoosterRecord | null;
  }> {
    const rawItems = await this.shopRepo.getUserInventory(communityId, userId);
    const allShopItems = await this.shopRepo.getItems();
    const itemMap = new Map(allShopItems.map((i) => [i.id, i]));

    const items = rawItems.map((inv) => ({
      ...inv,
      itemDetails: itemMap.get(inv.item_id),
    }));

    const activeBooster = await this.shopRepo.getActiveBooster(communityId, userId, "xp");

    return { items, activeBooster };
  }

  async buyItem(
    communityId: string,
    userId: string,
    itemId: string,
    quantity = 1
  ): Promise<BuyResult> {
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return { success: false, error: "Please enter a valid positive quantity!" };
    }

    const item = await this.shopRepo.getItem(itemId);
    if (!item) {
      return { success: false, error: `Item \`${itemId}\` was not found in the Mochi Bakery!` };
    }

    const totalCost = item.price * quantity;
    const account = await this.economyRepo.getAccount(communityId, userId);

    if (account.balance < totalCost) {
      return {
        success: false,
        error: `Insufficient balance! You need **${totalCost}** Mochi Bites, but you only have **${account.balance}**. (っ- ‸ - ς)`,
      };
    }

    // Deduct cost
    const newBalance = await this.economyRepo.deductBalance(communityId, userId, totalCost);

    // Add to inventory
    await this.shopRepo.addItemToInventory(communityId, userId, itemId, quantity);

    let boosterActivated = false;
    let boosterExpiresAt: string | undefined;

    // If booster, activate immediately!
    if (item.type === "booster") {
      const booster = await this.shopRepo.setActiveBooster(
        communityId,
        userId,
        "xp",
        item.effect_value || 2.0,
        2 * quantity // 2 hours per unit
      );
      boosterActivated = true;
      boosterExpiresAt = booster.expires_at;
    }

    logger.info(`User ${userId} bought ${quantity}x ${item.name} for ${totalCost} bites`);

    return {
      success: true,
      item,
      quantity,
      totalCost,
      newBalance,
      boosterActivated,
      boosterExpiresAt,
    };
  }
}
