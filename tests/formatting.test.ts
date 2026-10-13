import { describe, it, expect } from "vitest";
import {
  formatUserMention,
  formatRoleMention,
  formatChannelMention,
  extractUserId,
  extractUserName,
  extractRoleId,
  extractChannelId,
  formatNumber,
} from "../src/utils/formatting";

describe("Root Formatting Utils", () => {
  it("should format user mentions according to Root URI scheme", () => {
    expect(formatUserMention("usr_12345", "Saad")).toBe(
      "[@Saad](root://user/usr_12345)"
    );
    expect(formatUserMention("usr_99999")).toBe(
      "[@User](root://user/usr_99999)"
    );
  });

  it("should format role mentions according to Root URI scheme", () => {
    expect(formatRoleMention("role_mod_1", "Moderator")).toBe(
      "[@Moderator](root://role/role_mod_1)"
    );
  });

  it("should format channel mentions according to Root URI scheme", () => {
    expect(formatChannelMention("chan_general_1", "general")).toBe(
      "[#general](root://channel/chan_general_1)"
    );
  });

  it("should extract user ID from Root URI mentions or raw IDs", () => {
    expect(extractUserId("[@Saad](root://user/usr_abc12345)")).toBe("usr_abc12345");
    expect(extractUserId("root://user/usr_abc12345")).toBe("usr_abc12345");
    expect(extractUserId("usr_abc12345")).toBe("usr_abc12345");
    expect(extractUserId("invalid")).toBeNull();
    expect(extractUserId("")).toBeNull();
  });

  it("should extract role ID from Root URI mentions or raw IDs", () => {
    expect(extractRoleId("[@Moderator](root://role/role_mod_12345)")).toBe("role_mod_12345");
    expect(extractRoleId("root://role/role_mod_12345")).toBe("role_mod_12345");
    expect(extractRoleId("role_mod_12345")).toBe("role_mod_12345");
    expect(extractRoleId("abc")).toBeNull();
  });

  it("should extract channel ID from Root URI mentions or raw IDs", () => {
    expect(extractChannelId("[#rules](root://channel/chan_rules_123)")).toBe("chan_rules_123");
    expect(extractChannelId("root://channel/chan_rules_123")).toBe("chan_rules_123");
    expect(extractChannelId("chan_rules_123")).toBe("chan_rules_123");
    expect(extractChannelId("short")).toBeNull();
  });

  it("should extract user name from Root URI mentions", () => {
    expect(extractUserName("[@Saad](root://user/usr_abc12345)")).toBe("Saad");
    expect(extractUserName("[@Senzpy](root://user/0031ccb0-5f78-8c01-a333-44d9996fb339)")).toBe("Senzpy");
    expect(extractUserName("plain_text")).toBeNull();
  });

  it("should format numbers with comma separation", () => {
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatNumber(1234567)).toBe("1,234,567");
  });
});

