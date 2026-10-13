import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseManager } from "../src/database/db";
import { SettingsRepository } from "../src/database/repositories/settings";
import { WarningsRepository } from "../src/database/repositories/warnings";
import { EconomyRepository } from "../src/database/repositories/economy";
import { AchievementsRepository } from "../src/database/repositories/achievements";
import { ChannelGuid } from "../src/types/common";

describe("Database Repositories with SQLite", () => {
  let db: DatabaseManager;

  beforeEach(async () => {
    db = new DatabaseManager(":memory:");
    await db.initialize();
  });

  afterEach(async () => {
    await db.close();
  });

  describe("SettingsRepository", () => {
    it("should return default settings if not customized", async () => {
      const repo = new SettingsRepository(db);
      const settings = await repo.getSettings("comm_test_1");

      expect(settings.prefix).toBe("!");
      expect(settings.xpEnabled).toBe(true);
      expect(settings.economyEnabled).toBe(true);
      expect(settings.communityId).toBe("comm_test_1");
    });

    it("should save and retrieve custom settings", async () => {
      const repo = new SettingsRepository(db);
      const settings = await repo.getSettings("comm_test_1");
      settings.prefix = "?";
      settings.welcomeEnabled = true;
      settings.welcomeChannelId = "chan_welcome_1" as ChannelGuid;

      await repo.saveSettings(settings);

      const updated = await repo.getSettings("comm_test_1");
      expect(updated.prefix).toBe("?");
      expect(updated.welcomeEnabled).toBe(true);
      expect(updated.welcomeChannelId).toBe("chan_welcome_1");
    });
  });

  describe("WarningsRepository", () => {
    it("should record warnings and retrieve history correctly", async () => {
      const repo = new WarningsRepository(db);
      const w1 = await repo.addWarning(
        "comm_test_1",
        "usr_violator",
        "usr_mod",
        "Spamming channels"
      );
      expect(w1.id).toBeDefined();

      const w2 = await repo.addWarning(
        "comm_test_1",
        "usr_violator",
        "usr_mod",
        "Harassment"
      );
      expect(w2.id).toBeDefined();

      const count = await repo.getWarningCount("comm_test_1", "usr_violator");
      expect(count).toBe(2);

      const history = await repo.getWarnings("comm_test_1", "usr_violator");
      expect(history.length).toBe(2);
      expect(history[0].reason).toBe("Harassment"); // Sorted DESC by timestamp

      // Clear warnings
      const cleared = await repo.clearWarnings("comm_test_1", "usr_violator", "usr_mod");
      expect(cleared).toBe(2);

      const countAfter = await repo.getWarningCount("comm_test_1", "usr_violator");
      expect(countAfter).toBe(0);
    });
  });

  describe("EconomyRepository", () => {
    it("should initialize new users with balance 0 and allow atomic transactions", async () => {
      const repo = new EconomyRepository(db);
      const balance = await repo.getBalance("comm_test_1", "usr_alice");
      expect(balance).toBe(0);

      // Claim daily
      const daily = await repo.claimDaily("comm_test_1", "usr_alice", 150);
      expect(daily.success).toBe(true);
      expect(daily.newBalance).toBe(150);

      // Immediate second claim must fail (on 24h cooldown)
      const daily2 = await repo.claimDaily("comm_test_1", "usr_alice", 150);
      expect(daily2.success).toBe(false);

      // Atomic add and deduct balances
      const afterAdd = await repo.addBalance("comm_test_1", "usr_bob", 50);
      expect(afterAdd).toBe(50);

      const afterDeduct = await repo.deductBalance("comm_test_1", "usr_alice", 50);
      expect(afterDeduct).toBe(100);

      // Balance check
      expect(await repo.getBalance("comm_test_1", "usr_alice")).toBe(100);
      expect(await repo.getBalance("comm_test_1", "usr_bob")).toBe(50);
    });
  });

  describe("AchievementsRepository", () => {
    it("should unlock achievements and prevent duplicate unlocks", async () => {
      const repo = new AchievementsRepository(db);

      const res1 = await repo.unlockAchievement("comm_test_1", "usr_alice", "FIRST_MESSAGE");
      expect(res1.unlocked).toBe(true);
      expect(res1.achievement?.name).toBe("First Words");

      // Duplicate unlock
      const res2 = await repo.unlockAchievement("comm_test_1", "usr_alice", "FIRST_MESSAGE");
      expect(res2.unlocked).toBe(false);

      const userAchs = await repo.getUserAchievements("comm_test_1", "usr_alice");
      expect(userAchs.length).toBe(1);
      expect(userAchs[0].achievement_id).toBe("FIRST_MESSAGE");
    });
  });
});
