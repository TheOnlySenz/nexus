import { DatabaseManager } from "../db";
import { ShopItemRecord, UserInventoryRecord, ActiveBoosterRecord } from "../../types/database";

export const DEFAULT_SHOP_ITEMS: ShopItemRecord[] = [
  {
    id: "sakura_tea",
    name: "Sakura Tea",
    description: "A fragrant cup of warm cherry blossom tea. Gently relaxes your soul.",
    price: 50,
    icon: "🍵",
    type: "snack",
    effect_value: 15, // feeds pet +15 hunger / +10 happiness
  },
  {
    id: "strawberry_daifuku",
    name: "Strawberry Daifuku",
    description: "Soft chewy mochi stuffed with sweet red bean and a fresh ripe strawberry.",
    price: 75,
    icon: "🍓",
    type: "snack",
    effect_value: 25, // feeds pet +25 hunger / +20 happiness
  },
  {
    id: "rainbow_dango",
    name: "Rainbow Dango",
    description: "A sweet tri-color dango skewer that gives extra happiness when fed to Mochi-chan!",
    price: 100,
    icon: "🍡",
    type: "snack",
    effect_value: 40, // feeds pet +40 hunger / +35 happiness
  },
  {
    id: "matcha_parfait",
    name: "Matcha Parfait",
    description: "Kyoto matcha ice cream, chewy dango balls, and sweet azuki bean drizzle.",
    price: 120,
    icon: "🍨",
    type: "snack",
    effect_value: 50,
  },
  {
    id: "golden_blossom",
    name: "Golden Blossom",
    description: "A rare shimmering blossom plucked from an ancient sakura tree. Keeps good fortune close.",
    price: 500,
    icon: "🌸",
    type: "collectible",
    effect_value: 0,
  },
  {
    id: "mochi_plushie",
    name: "Mochi Plushie",
    description: "An irresistibly soft, huggable plushie of Mochi-chan. Super cozy!",
    price: 300,
    icon: "🧸",
    type: "collectible",
    effect_value: 0,
  },
  {
    id: "xp_booster_2x",
    name: "Double-XP Booster",
    description: "Grants 2x Mochi XP multiplier on all messages for 2 hours!",
    price: 250,
    icon: "✨",
    type: "booster",
    effect_value: 2.0, // 2x multiplier
  },
];

export class ShopRepository {
  constructor(private readonly db: DatabaseManager) {}

  async seedDefaultItems(): Promise<void> {
    for (const item of DEFAULT_SHOP_ITEMS) {
      await this.db.run(
        `INSERT INTO shop_items (id, name, description, price, icon, type, effect_value)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           description = excluded.description,
           price = excluded.price,
           icon = excluded.icon,
           type = excluded.type,
           effect_value = excluded.effect_value`,
        [item.id, item.name, item.description, item.price, item.icon, item.type, item.effect_value]
      );
    }
  }

  async getItems(): Promise<ShopItemRecord[]> {
    return this.db.all<ShopItemRecord>("SELECT * FROM shop_items ORDER BY price ASC");
  }

  async getItem(id: string): Promise<ShopItemRecord | null> {
    const row = await this.db.get<ShopItemRecord>("SELECT * FROM shop_items WHERE id = ?", [id]);
    return row || null;
  }

  async getUserInventory(communityId: string, userId: string): Promise<UserInventoryRecord[]> {
    return this.db.all<UserInventoryRecord>(
      "SELECT * FROM user_inventory WHERE community_id = ? AND user_id = ? AND quantity > 0 ORDER BY acquired_at DESC",
      [communityId, userId]
    );
  }

  async getUserItem(communityId: string, userId: string, itemId: string): Promise<UserInventoryRecord | null> {
    const row = await this.db.get<UserInventoryRecord>(
      "SELECT * FROM user_inventory WHERE community_id = ? AND user_id = ? AND item_id = ?",
      [communityId, userId, itemId]
    );
    return row || null;
  }

  async addItemToInventory(
    communityId: string,
    userId: string,
    itemId: string,
    quantity = 1
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO user_inventory (community_id, user_id, item_id, quantity, acquired_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(community_id, user_id, item_id) DO UPDATE SET
         quantity = quantity + excluded.quantity,
         acquired_at = excluded.acquired_at`,
      [communityId, userId, itemId, quantity, now]
    );
  }

  async consumeItemFromInventory(
    communityId: string,
    userId: string,
    itemId: string,
    quantity = 1
  ): Promise<boolean> {
    const item = await this.getUserItem(communityId, userId, itemId);
    if (!item || item.quantity < quantity) {
      return false;
    }

    if (item.quantity === quantity) {
      await this.db.run(
        "DELETE FROM user_inventory WHERE community_id = ? AND user_id = ? AND item_id = ?",
        [communityId, userId, itemId]
      );
    } else {
      await this.db.run(
        "UPDATE user_inventory SET quantity = quantity - ? WHERE community_id = ? AND user_id = ? AND item_id = ?",
        [quantity, communityId, userId, itemId]
      );
    }
    return true;
  }

  async getActiveBooster(
    communityId: string,
    userId: string,
    boosterType = "xp"
  ): Promise<ActiveBoosterRecord | null> {
    const row = await this.db.get<ActiveBoosterRecord>(
      "SELECT * FROM active_boosters WHERE community_id = ? AND user_id = ? AND booster_type = ?",
      [communityId, userId, boosterType]
    );
    if (!row) return null;

    // Check expiration
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      await this.db.run(
        "DELETE FROM active_boosters WHERE community_id = ? AND user_id = ? AND booster_type = ?",
        [communityId, userId, boosterType]
      );
      return null;
    }

    return row;
  }

  async setActiveBooster(
    communityId: string,
    userId: string,
    boosterType: string,
    multiplier: number,
    durationHours: number
  ): Promise<ActiveBoosterRecord> {
    const existing = await this.getActiveBooster(communityId, userId, boosterType);
    const now = Date.now();
    let baseTime = now;

    if (existing && new Date(existing.expires_at).getTime() > now) {
      // Stack duration if already active
      baseTime = new Date(existing.expires_at).getTime();
    }

    const expiresAt = new Date(baseTime + durationHours * 3600 * 1000).toISOString();

    await this.db.run(
      `INSERT INTO active_boosters (community_id, user_id, booster_type, multiplier, expires_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(community_id, user_id, booster_type) DO UPDATE SET
         multiplier = excluded.multiplier,
         expires_at = excluded.expires_at`,
      [communityId, userId, boosterType, multiplier, expiresAt]
    );

    return {
      community_id: communityId,
      user_id: userId,
      booster_type: boosterType,
      multiplier,
      expires_at: expiresAt,
    };
  }
}
