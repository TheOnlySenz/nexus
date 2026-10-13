import { ChannelGuid, CommunityRoleGuid } from "./common";

export interface CommunitySettings {
  communityId: string;
  prefix: string;
  welcomeEnabled: boolean;
  welcomeChannelId: ChannelGuid | null;
  welcomeMessage: string;
  autoRoleId: CommunityRoleGuid | null;
  xpEnabled: boolean;
  xpCooldownSeconds: number;
  minXpPerMessage: number;
  maxXpPerMessage: number;
  levelAnnouncements: boolean;
  automodEnabled: boolean;
  automodBlockLinks: boolean;
  automodBlockWords: string[];
  automodSpamThreshold: number;
  moderationLogChannelId: ChannelGuid | null;
  economyEnabled: boolean;
  currencyName: string;
  currencySymbol: string;
  dailyRewardAmount: number;
  confessionChannelId: ChannelGuid | null;
  starboardChannelId: ChannelGuid | null;
  starboardThreshold: number;
  updatedAt: string;
}

