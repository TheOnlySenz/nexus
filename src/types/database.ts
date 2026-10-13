export interface WarningRecord {
  id: string;
  community_id: string;
  user_id: string;
  moderator_id: string;
  reason: string;
  created_at: string;
}

export interface UserXpRecord {
  community_id: string;
  user_id: string;
  xp: number;
  level: number;
  message_count: number;
  last_message_at: string;
  updated_at: string;
}

export interface LevelRewardRecord {
  community_id: string;
  level: number;
  role_id: string;
  role_name: string;
  created_at: string;
}

export interface UserAchievementRecord {
  community_id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface ReactionRoleRecord {
  id: string;
  community_id: string;
  message_id: string;
  channel_id: string;
  shortcode: string;
  role_id: string;
  created_by: string;
  created_at: string;
}

export interface GiveawayRecord {
  id: string;
  community_id: string;
  channel_id: string;
  message_id: string;
  prize: string;
  winner_count: number;
  ends_at: string;
  created_by: string;
  created_at: string;
  status: "active" | "ended" | "cancelled";
  winners: string; // JSON array of user IDs
}

export interface GiveawayEntryRecord {
  giveaway_id: string;
  user_id: string;
  entered_at: string;
}

export interface ModerationLogRecord {
  id: string;
  community_id: string;
  action: "warn" | "clearwarnings" | "kick" | "ban" | "unban" | "purge" | "automod_delete" | "automod_flag";
  target_user_id: string;
  moderator_id: string;
  reason: string;
  channel_id: string | null;
  message_id: string | null;
  created_at: string;
}

export interface EconomyAccountRecord {
  community_id: string;
  user_id: string;
  balance: number;
  last_daily_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsDailyRecord {
  community_id: string;
  date: string; // YYYY-MM-DD
  message_count: number;
  unique_active_users: number;
  commands_used: number;
  moderation_actions: number;
  new_members: number;
}
