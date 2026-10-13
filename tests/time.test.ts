import { describe, it, expect } from "vitest";
import { parseDuration, formatDuration } from "../src/utils/time";

describe("Time & Duration Utilities", () => {
  it("should parse valid duration strings correctly", () => {
    expect(parseDuration("30s")).toBe(30 * 1000);
    expect(parseDuration("15m")).toBe(15 * 60 * 1000);
    expect(parseDuration("2h")).toBe(2 * 60 * 60 * 1000);
    expect(parseDuration("1d")).toBe(24 * 60 * 60 * 1000);
    expect(parseDuration("7D")).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("should return null for invalid duration strings", () => {
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("invalid")).toBeNull();
    expect(parseDuration("10x")).toBeNull();
    expect(parseDuration("m10")).toBeNull();
  });

  it("should format milliseconds into human readable strings", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(45 * 1000)).toBe("45s");
    expect(formatDuration(90 * 1000)).toBe("1m 30s");
    expect(formatDuration(2 * 3600 * 1000 + 30 * 60 * 1000)).toBe("2h 30m");
    expect(formatDuration(3 * 24 * 3600 * 1000 + 4 * 3600 * 1000)).toBe("3d 4h");
  });
});
