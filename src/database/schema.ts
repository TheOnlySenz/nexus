export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS community_settings (
  community_id TEXT PRIMARY KEY,
  prefix TEXT NOT NULL DEFAULT '!',
  welcome_enabled INTEGER NOT NULL DEFAULT 0,
  welcome_channel_id TEXT,
  welcome_message TEXT NOT NULL DEFAULT '👋 Welcome {user} to the community! You are member #{memberCount}.',
  auto_role_id TEXT,
  xp_enabled INTEGER NOT NULL DEFAULT 1,
  xp_cooldown_seconds INTEGER NOT NULL DEFAULT 60,
  min_xp_per_message INTEGER NOT NULL DEFAULT 15,
  max_xp_per_message INTEGER NOT NULL DEFAULT 25,
  level_announcements INTEGER NOT NULL DEFAULT 1,
  automod_enabled INTEGER NOT NULL DEFAULT 0,
  automod_block_links INTEGER NOT NULL DEFAULT 0,
  automod_block_words TEXT NOT NULL DEFAULT '[]',
  automod_spam_threshold INTEGER NOT NULL DEFAULT 5,
  moderation_log_channel_id TEXT,
  economy_enabled INTEGER NOT NULL DEFAULT 1,
  currency_name TEXT NOT NULL DEFAULT 'Mochi Bites',
  currency_symbol TEXT NOT NULL DEFAULT '🍡',
  daily_reward_amount INTEGER NOT NULL DEFAULT 100,
  confession_channel_id TEXT,
  starboard_channel_id TEXT,
  starboard_threshold INTEGER NOT NULL DEFAULT 3,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS warnings (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  moderator_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_warnings_user ON warnings(community_id, user_id);

CREATE TABLE IF NOT EXISTS xp_users (
  community_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (community_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_xp_leaderboard ON xp_users(community_id, xp DESC);

CREATE TABLE IF NOT EXISTS level_rewards (
  community_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  role_id TEXT NOT NULL,
  role_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (community_id, level)
);

CREATE TABLE IF NOT EXISTS user_achievements (
  community_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at TEXT NOT NULL,
  PRIMARY KEY (community_id, user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS reaction_roles (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  shortcode TEXT NOT NULL,
  role_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reaction_roles_lookup ON reaction_roles(community_id, message_id, shortcode);

CREATE TABLE IF NOT EXISTS giveaways (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  prize TEXT NOT NULL,
  winner_count INTEGER NOT NULL DEFAULT 1,
  ends_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  winners TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS giveaway_entries (
  giveaway_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  entered_at TEXT NOT NULL,
  PRIMARY KEY (giveaway_id, user_id)
);

CREATE TABLE IF NOT EXISTS moderation_logs (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  moderator_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  channel_id TEXT,
  message_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mod_logs_community ON moderation_logs(community_id, created_at DESC);

CREATE TABLE IF NOT EXISTS economy_accounts (
  community_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  last_daily_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (community_id, user_id)
);

CREATE TABLE IF NOT EXISTS analytics_daily (
  community_id TEXT NOT NULL,
  date TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  unique_active_users INTEGER NOT NULL DEFAULT 0,
  commands_used INTEGER NOT NULL DEFAULT 0,
  moderation_actions INTEGER NOT NULL DEFAULT 0,
  new_members INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (community_id, date)
);

CREATE TABLE IF NOT EXISTS shop_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  icon TEXT NOT NULL,
  type TEXT NOT NULL,
  effect_value REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_inventory (
  community_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  acquired_at TEXT NOT NULL,
  PRIMARY KEY (community_id, user_id, item_id)
);

CREATE TABLE IF NOT EXISTS active_boosters (
  community_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  booster_type TEXT NOT NULL,
  multiplier REAL NOT NULL,
  expires_at TEXT NOT NULL,
  PRIMARY KEY (community_id, user_id, booster_type)
);

CREATE TABLE IF NOT EXISTS community_pet (
  community_id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Mochi-chan (もちちゃん)',
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  hunger INTEGER NOT NULL DEFAULT 100,
  happiness INTEGER NOT NULL DEFAULT 100,
  last_fed_at TEXT,
  last_petted_at TEXT,
  total_treats INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS starboard_messages (
  community_id TEXT NOT NULL,
  original_message_id TEXT NOT NULL,
  starboard_message_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  star_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (community_id, original_message_id)
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  remind_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status, remind_at);
`;

