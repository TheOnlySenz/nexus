import { describe, it, expect } from "vitest";
import { CooldownManager } from "../src/core/rate-limiter";

describe("CooldownManager", () => {
  it("should allow first access and record cooldown", () => {
    const cm = new CooldownManager();
    const result = cm.check("user:1:ping", 5000);

    expect(result.onCooldown).toBe(false);
    expect(result.remainingMs).toBe(0);

    // Second immediate check must be on cooldown
    const result2 = cm.check("user:1:ping", 5000);
    expect(result2.onCooldown).toBe(true);
    expect(result2.remainingMs).toBeGreaterThan(0);
    expect(result2.remainingMs).toBeLessThanOrEqual(5000);
  });

  it("should clear cooldown when cleared explicitly", () => {
    const cm = new CooldownManager();
    cm.check("user:2:warn", 10000);
    expect(cm.check("user:2:warn", 10000).onCooldown).toBe(true);

    cm.clear("user:2:warn");
    expect(cm.check("user:2:warn", 10000).onCooldown).toBe(false);
  });

  it("should sweep expired entries cleanly", async () => {
    const cm = new CooldownManager();
    cm.check("temp_key", 10); // 10ms cooldown

    await new Promise((resolve) => setTimeout(resolve, 20));
    cm.sweep();

    const result = cm.check("temp_key", 10);
    expect(result.onCooldown).toBe(false);
  });
});
