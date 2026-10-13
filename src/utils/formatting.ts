import { UserGuid, CommunityRoleGuid, ChannelGuid } from "../types/common";

/**
 * Creates a Root-native user mention Markdown link.
 */
export function formatUserMention(userId: UserGuid | string, displayName: string = "User"): string {
  return `[@${displayName}](root://user/${userId})`;
}

/**
 * Creates a Root-native role mention Markdown link.
 */
export function formatRoleMention(roleId: CommunityRoleGuid | string, roleName: string = "Role"): string {
  return `[@${roleName}](root://role/${roleId})`;
}

/**
 * Creates a Root-native channel mention Markdown link.
 */
export function formatChannelMention(channelId: ChannelGuid | string, channelName: string = "channel"): string {
  return `[#${channelName}](root://channel/${channelId})`;
}

/**
 * Extracts a UserGuid from either a Root mention `[@Name](root://user/{id})` or a raw ID.
 */
export function extractUserId(input: string): string | null {
  if (!input) return null;
  const match = input.match(/root:\/\/user\/([A-Za-z0-9_-]+)/i);
  if (match) return match[1];

  // If input is already a raw GUID-like string (alphanumeric, dashes, underscores)
  if (/^[A-Za-z0-9_-]{8,}$/.test(input.trim())) {
    return input.trim();
  }
  return null;
}

/**
 * Extracts a CommunityRoleGuid from either a Root mention `[@Name](root://role/{id})` or a raw ID.
 */
export function extractRoleId(input: string): string | null {
  if (!input) return null;
  const match = input.match(/root:\/\/role\/([A-Za-z0-9_-]+)/i);
  if (match) return match[1];

  if (/^[A-Za-z0-9_-]{8,}$/.test(input.trim())) {
    return input.trim();
  }
  return null;
}

/**
 * Extracts a ChannelGuid from either a Root mention `[#Name](root://channel/{id})` or a raw ID.
 */
export function extractChannelId(input: string): string | null {
  if (!input) return null;
  const match = input.match(/root:\/\/channel\/([A-Za-z0-9_-]+)/i);
  if (match) return match[1];

  if (/^[A-Za-z0-9_-]{8,}$/.test(input.trim())) {
    return input.trim();
  }
  return null;
}

/**
 * Formats a number with thousands separators.
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}
