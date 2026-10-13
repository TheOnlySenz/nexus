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
 * Extracts a display name from a Root mention `[@Name](root://user/{id})` if present.
 */
export function extractUserName(input: string): string | null {
  if (!input) return null;
  const match = input.match(/\[@([^\]]+)\]\(root:\/\/user\/[A-Za-z0-9_-]+\)/i);
  return match ? match[1] : null;
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

/**
 * Pastel Sakura aesthetic dividers
 */
export const CUTE_DIVIDER = "─── ･ ｡ﾟ☆: *. 🍡 .* :☆ﾟ. ───";
export const SAKURA_DIVIDER = "─── ･ ｡ﾟ☆: *. 🌸 .* :☆ﾟ. ───";

/**
 * Creates a cute aesthetic progress bar (e.g. [▰▰▰▰▱▱▱▱▱▱] 40%)
 */
export function formatProgressBar(current: number, total: number, size: number = 10): string {
  if (total <= 0) return `[${"▱".repeat(size)}] 0%`;
  const ratio = Math.min(Math.max(current / total, 0), 1);
  const filled = Math.round(ratio * size);
  const empty = size - filled;
  const percentage = Math.round(ratio * 100);
  return `\`[${"▰".repeat(filled)}${"▱".repeat(empty)}]\` **${percentage}%**`;
}
