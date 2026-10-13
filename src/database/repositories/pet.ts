import { DatabaseManager } from "../db";
import { CommunityPetRecord } from "../../types/database";

export class PetRepository {
  constructor(private readonly db: DatabaseManager) {}

  async getPet(communityId: string): Promise<CommunityPetRecord> {
    const row = await this.db.get<CommunityPetRecord>(
      "SELECT * FROM community_pet WHERE community_id = ?",
      [communityId]
    );

    if (!row) {
      const initial: CommunityPetRecord = {
        community_id: communityId,
        name: "Mochi-chan (もちちゃん)",
        level: 1,
        xp: 0,
        hunger: 85,
        happiness: 90,
        last_fed_at: new Date().toISOString(),
        last_petted_at: new Date().toISOString(),
        total_treats: 0,
      };

      await this.db.run(
        `INSERT INTO community_pet (
          community_id, name, level, xp, hunger, happiness, last_fed_at, last_petted_at, total_treats
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          initial.community_id,
          initial.name,
          initial.level,
          initial.xp,
          initial.hunger,
          initial.happiness,
          initial.last_fed_at,
          initial.last_petted_at,
          initial.total_treats,
        ]
      );

      return initial;
    }

    // Apply gentle time-based decay so pet feels alive
    const now = Date.now();
    let updatedHunger = row.hunger;
    let updatedHappiness = row.happiness;

    if (row.last_fed_at) {
      const hoursSinceFed = (now - new Date(row.last_fed_at).getTime()) / (3600 * 1000);
      if (hoursSinceFed > 2) {
        // Lose ~2 hunger per hour after 2 hours
        updatedHunger = Math.max(10, Math.round(row.hunger - (hoursSinceFed - 2) * 2));
      }
    }

    if (row.last_petted_at) {
      const hoursSincePetted = (now - new Date(row.last_petted_at).getTime()) / (3600 * 1000);
      if (hoursSincePetted > 3) {
        // Lose ~1.5 happiness per hour after 3 hours
        updatedHappiness = Math.max(15, Math.round(row.happiness - (hoursSincePetted - 3) * 1.5));
      }
    }

    if (updatedHunger !== row.hunger || updatedHappiness !== row.happiness) {
      await this.db.run(
        "UPDATE community_pet SET hunger = ?, happiness = ? WHERE community_id = ?",
        [updatedHunger, updatedHappiness, communityId]
      );
      row.hunger = updatedHunger;
      row.happiness = updatedHappiness;
    }

    return row;
  }

  async feedPet(
    communityId: string,
    hungerBoost: number,
    happinessBoost: number,
    xpBoost: number
  ): Promise<{ pet: CommunityPetRecord; leveledUp: boolean; oldLevel: number }> {
    const pet = await this.getPet(communityId);
    const oldLevel = pet.level;
    const now = new Date().toISOString();

    const newHunger = Math.min(100, pet.hunger + hungerBoost);
    const newHappiness = Math.min(100, pet.happiness + happinessBoost);
    let newXp = pet.xp + xpBoost;
    let newLevel = pet.level;

    // Check level up: 100 * level required to level up
    while (newXp >= newLevel * 100) {
      newXp -= newLevel * 100;
      newLevel += 1;
    }

    const totalTreats = pet.total_treats + 1;

    await this.db.run(
      `UPDATE community_pet
       SET hunger = ?, happiness = ?, xp = ?, level = ?, last_fed_at = ?, total_treats = ?
       WHERE community_id = ?`,
      [newHunger, newHappiness, newXp, newLevel, now, totalTreats, communityId]
    );

    const updated: CommunityPetRecord = {
      ...pet,
      hunger: newHunger,
      happiness: newHappiness,
      xp: newXp,
      level: newLevel,
      last_fed_at: now,
      total_treats: totalTreats,
    };

    return {
      pet: updated,
      leveledUp: newLevel > oldLevel,
      oldLevel,
    };
  }

  async petPet(
    communityId: string,
    happinessBoost = 10,
    xpBoost = 5
  ): Promise<{ pet: CommunityPetRecord; leveledUp: boolean; oldLevel: number }> {
    const pet = await this.getPet(communityId);
    const oldLevel = pet.level;
    const now = new Date().toISOString();

    const newHappiness = Math.min(100, pet.happiness + happinessBoost);
    let newXp = pet.xp + xpBoost;
    let newLevel = pet.level;

    while (newXp >= newLevel * 100) {
      newXp -= newLevel * 100;
      newLevel += 1;
    }

    await this.db.run(
      `UPDATE community_pet
       SET happiness = ?, xp = ?, level = ?, last_petted_at = ?
       WHERE community_id = ?`,
      [newHappiness, newXp, newLevel, now, communityId]
    );

    const updated: CommunityPetRecord = {
      ...pet,
      happiness: newHappiness,
      xp: newXp,
      level: newLevel,
      last_petted_at: now,
    };

    return {
      pet: updated,
      leveledUp: newLevel > oldLevel,
      oldLevel,
    };
  }
}
