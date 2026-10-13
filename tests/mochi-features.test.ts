import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseManager } from "../src/database/db";
import { ShopRepository } from "../src/database/repositories/shop";
import { EconomyRepository } from "../src/database/repositories/economy";
import { ShopModule } from "../src/modules/shop/shop";
import { PetRepository } from "../src/database/repositories/pet";
import { PetModule } from "../src/modules/games/pet";
import { StarboardRepository } from "../src/database/repositories/starboard";
import { RemindersRepository } from "../src/database/repositories/reminders";
import { RemindersModule } from "../src/modules/reminders/reminders";
import { ChannelGuid } from "../src/types/common";

describe("Mochi (もち) Extended Features Test Suite", () => {
  let db: DatabaseManager;

  beforeEach(async () => {
    db = new DatabaseManager(":memory:");
    await db.initialize();
  });

  afterEach(async () => {
    await db.close();
  });

  describe("Shop & Inventory Module", () => {
    it("should seed default bakery items and list them", async () => {
      const shopRepo = new ShopRepository(db);
      await shopRepo.seedDefaultItems();

      const items = await shopRepo.getItems();
      expect(items.length).toBeGreaterThanOrEqual(6);

      const sakuraTea = items.find((i) => i.id === "sakura_tea");
      expect(sakuraTea).toBeDefined();
      expect(sakuraTea?.price).toBe(50);
      expect(sakuraTea?.icon).toBe("🍵");
    });

    it("should allow a member to purchase an item, deduct balance, and update inventory", async () => {
      const shopRepo = new ShopRepository(db);
      await shopRepo.seedDefaultItems();
      const economyRepo = new EconomyRepository(db);
      const shopModule = new ShopModule(shopRepo, economyRepo);

      const communityId = "comm_sweet_1";
      const userId = "usr_baker_1";

      // Give user initial balance
      await economyRepo.addBalance(communityId, userId, 200);

      // Buy Strawberry Daifuku (75 bites)
      const buyRes = await shopModule.buyItem(communityId, userId, "strawberry_daifuku", 2);
      expect(buyRes.success).toBe(true);
      expect(buyRes.totalCost).toBe(150);
      expect(buyRes.newBalance).toBe(50);

      // Check inventory
      const { items } = await shopModule.getUserInventory(communityId, userId);
      expect(items.length).toBe(1);
      expect(items[0].item_id).toBe("strawberry_daifuku");
      expect(items[0].quantity).toBe(2);
    });

    it("should auto-activate double XP booster upon purchase", async () => {
      const shopRepo = new ShopRepository(db);
      await shopRepo.seedDefaultItems();
      const economyRepo = new EconomyRepository(db);
      const shopModule = new ShopModule(shopRepo, economyRepo);

      const communityId = "comm_sweet_1";
      const userId = "usr_booster_1";

      await economyRepo.addBalance(communityId, userId, 500);

      const buyRes = await shopModule.buyItem(communityId, userId, "xp_booster_2x", 1);
      expect(buyRes.success).toBe(true);
      expect(buyRes.boosterActivated).toBe(true);
      expect(buyRes.boosterExpiresAt).toBeDefined();

      const active = await shopRepo.getActiveBooster(communityId, userId, "xp");
      expect(active).not.toBeNull();
      expect(active?.multiplier).toBe(2.0);
    });
  });

  describe("Community Mascot (Mochi-chan) Pet Module", () => {
    it("should initialize default pet stats and allow petting", async () => {
      const petRepo = new PetRepository(db);
      const shopRepo = new ShopRepository(db);
      const economyRepo = new EconomyRepository(db);
      const petModule = new PetModule(petRepo, shopRepo, economyRepo);

      const communityId = "comm_pet_1";
      const status = await petModule.getStatus(communityId);
      expect(status.pet.name).toBe("Mochi-chan (もちちゃん)");
      expect(status.pet.level).toBe(1);
      expect(status.mood).toBeDefined();

      // Pet Mochi-chan
      const petRes = await petModule.pet(communityId, "usr_petter_1");
      expect(petRes.success).toBe(true);
      expect(petRes.message).toContain("GENTLE HEADPAT");

      const afterPet = await petRepo.getPet(communityId);
      expect(afterPet.xp).toBeGreaterThan(0);
    });

    it("should allow feeding with snacks from inventory and increase hunger & happiness", async () => {
      const petRepo = new PetRepository(db);
      const shopRepo = new ShopRepository(db);
      await shopRepo.seedDefaultItems();
      const economyRepo = new EconomyRepository(db);
      const petModule = new PetModule(petRepo, shopRepo, economyRepo);

      const communityId = "comm_pet_1";
      const userId = "usr_feeder_1";

      // Add snack to user inventory
      await shopRepo.addItemToInventory(communityId, userId, "rainbow_dango", 1);

      // Feed rainbow dango
      const feedRes = await petModule.feed(communityId, userId, "rainbow_dango");
      expect(feedRes.success).toBe(true);
      expect(feedRes.message).toContain("Rainbow Dango");

      // Verify item was consumed
      const userItem = await shopRepo.getUserItem(communityId, userId, "rainbow_dango");
      expect(userItem).toBeNull();
    });
  });

  describe("Starboard & Reminders Repositories", () => {
    it("should record starboard messages and update star count", async () => {
      const starboardRepo = new StarboardRepository(db);
      const communityId = "comm_stars_1";

      await starboardRepo.createStarboardMessage({
        community_id: communityId,
        original_message_id: "msg_original_1",
        starboard_message_id: "msg_starboard_1",
        channel_id: "chan_chat_1",
        author_id: "usr_star_author",
        star_count: 3,
        created_at: new Date().toISOString(),
      });

      const found = await starboardRepo.getStarboardMessage(communityId, "msg_original_1");
      expect(found).not.toBeNull();
      expect(found?.star_count).toBe(3);

      await starboardRepo.updateStarCount(communityId, "msg_original_1", 5);
      const updated = await starboardRepo.getStarboardMessage(communityId, "msg_original_1");
      expect(updated?.star_count).toBe(5);
    });

    it("should schedule reminders, query due reminders, and mark delivered", async () => {
      const remindersRepo = new RemindersRepository(db);
      const communityId = "comm_remind_1";

      const pastIso = new Date(Date.now() - 5000).toISOString();
      await remindersRepo.createReminder({
        id: "rem_test_1",
        community_id: communityId,
        channel_id: "chan_chat_1",
        user_id: "usr_sleeper_1",
        message: "Take a stretch break",
        remind_at: pastIso,
        created_at: new Date().toISOString(),
        status: "pending",
      });

      const due = await remindersRepo.getPendingReminders(new Date().toISOString());
      expect(due.length).toBe(1);
      expect(due[0].id).toBe("rem_test_1");

      await remindersRepo.markDelivered("rem_test_1");
      const dueAfter = await remindersRepo.getPendingReminders(new Date().toISOString());
      expect(dueAfter.length).toBe(0);
    });
  });
});
