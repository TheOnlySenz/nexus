import { describe, it, expect } from "vitest";
import {
  calculateLevelFromXp,
  calculateXpRequiredForLevel,
} from "../src/database/repositories/xp";

describe("Leveling Calculations", () => {
  it("should calculate level 0 for 0 or negative XP", () => {
    expect(calculateLevelFromXp(0)).toBe(0);
    expect(calculateLevelFromXp(-50)).toBe(0);
  });

  it("should calculate level 1 at 100 XP", () => {
    expect(calculateLevelFromXp(100)).toBe(1);
    expect(calculateLevelFromXp(99)).toBe(0);
  });

  it("should scale progressively with increasing XP", () => {
    const level1Req = calculateXpRequiredForLevel(1);
    const level2Req = calculateXpRequiredForLevel(2);
    const level5Req = calculateXpRequiredForLevel(5);
    const level10Req = calculateXpRequiredForLevel(10);

    expect(level1Req).toBe(100);
    expect(level2Req).toBeGreaterThan(level1Req);
    expect(level5Req).toBeGreaterThan(level2Req);
    expect(level10Req).toBeGreaterThan(level5Req);

    // Verify inverse relationship holds
    expect(calculateLevelFromXp(level1Req)).toBe(1);
    expect(calculateLevelFromXp(level2Req)).toBe(2);
    expect(calculateLevelFromXp(level5Req)).toBe(5);
    expect(calculateLevelFromXp(level10Req)).toBe(10);
  });

  it("should handle level bounds correctly", () => {
    expect(calculateXpRequiredForLevel(0)).toBe(0);
    expect(calculateXpRequiredForLevel(-1)).toBe(0);
  });
});
