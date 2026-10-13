import { CommunitySettings } from "../types/settings";

export const DEFAULT_SETTINGS: Omit<CommunitySettings, "communityId" | "updatedAt"> = {
  prefix: "!",
  welcomeEnabled: false,
  welcomeChannelId: null,
  welcomeMessage: "👋 Welcome {user} to the community! You are member #{memberCount}.",
  autoRoleId: null,
  xpEnabled: true,
  xpCooldownSeconds: 60,
  minXpPerMessage: 15,
  maxXpPerMessage: 25,
  levelAnnouncements: true,
  automodEnabled: false,
  automodBlockLinks: false,
  automodBlockWords: [],
  automodSpamThreshold: 5,
  moderationLogChannelId: null,
  economyEnabled: true,
  currencyName: "Nexus Credits",
  currencySymbol: "⬡",
  dailyRewardAmount: 100,
};

export const CONSTANTS = {
  BOT_NAME: "NEXUS",
  VERSION: "1.0.0",
  DEFAULT_PAGE_SIZE: 10,
  MAX_WARNINGS_DISPLAY: 10,
  RATE_LIMIT: {
    COMMAND_PACE_MS: 250,
    QUERY_PACE_MS: 50,
    MAX_RETRIES: 3,
    BASE_BACKOFF_MS: 500,
    MAX_BACKOFF_MS: 15000,
  },
  XP: {
    BASE_XP: 100,
    GROWTH_FACTOR: 1.5,
  },
};
