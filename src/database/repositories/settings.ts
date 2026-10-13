import { DatabaseManager } from "../db";
import { CommunitySettings } from "../../types/settings";
import { DEFAULT_SETTINGS } from "../../config/defaults";
import { ChannelGuid, CommunityRoleGuid } from "../../types/common";

export class SettingsRepository {
  constructor(private readonly db: DatabaseManager) {}

  async getSettings(communityId: string): Promise<CommunitySettings> {
    const row = await this.db.get<Record<string, unknown>>(
      "SELECT * FROM community_settings WHERE community_id = ?",
      [communityId]
    );

    if (!row) {
      const now = new Date().toISOString();
      const initial: CommunitySettings = {
        communityId,
        ...DEFAULT_SETTINGS,
        updatedAt: now,
      };

      await this.saveSettings(initial);
      return initial;
    }

    let automodBlockWords: string[] = [];
    try {
      if (typeof row.automod_block_words === "string") {
        automodBlockWords = JSON.parse(row.automod_block_words);
      }
    } catch {
      automodBlockWords = [];
    }

    return {
      communityId: String(row.community_id),
      prefix: String(row.prefix ?? DEFAULT_SETTINGS.prefix),
      welcomeEnabled: Boolean(row.welcome_enabled),
      welcomeChannelId: (row.welcome_channel_id as ChannelGuid) || null,
      welcomeMessage: String(row.welcome_message ?? DEFAULT_SETTINGS.welcomeMessage),
      autoRoleId: (row.auto_role_id as CommunityRoleGuid) || null,
      xpEnabled: Boolean(row.xp_enabled),
      xpCooldownSeconds: Number(row.xp_cooldown_seconds ?? DEFAULT_SETTINGS.xpCooldownSeconds),
      minXpPerMessage: Number(row.min_xp_per_message ?? DEFAULT_SETTINGS.minXpPerMessage),
      maxXpPerMessage: Number(row.max_xp_per_message ?? DEFAULT_SETTINGS.maxXpPerMessage),
      levelAnnouncements: Boolean(row.level_announcements),
      automodEnabled: Boolean(row.automod_enabled),
      automodBlockLinks: Boolean(row.automod_block_links),
      automodBlockWords,
      automodSpamThreshold: Number(row.automod_spam_threshold ?? DEFAULT_SETTINGS.automodSpamThreshold),
      moderationLogChannelId: (row.moderation_log_channel_id as ChannelGuid) || null,
      economyEnabled: Boolean(row.economy_enabled),
      currencyName: String(row.currency_name ?? DEFAULT_SETTINGS.currencyName),
      currencySymbol: String(row.currency_symbol ?? DEFAULT_SETTINGS.currencySymbol),
      dailyRewardAmount: Number(row.daily_reward_amount ?? DEFAULT_SETTINGS.dailyRewardAmount),
      updatedAt: String(row.updated_at),
    };
  }

  async saveSettings(settings: CommunitySettings): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO community_settings (
        community_id, prefix, welcome_enabled, welcome_channel_id, welcome_message,
        auto_role_id, xp_enabled, xp_cooldown_seconds, min_xp_per_message, max_xp_per_message,
        level_announcements, automod_enabled, automod_block_links, automod_block_words,
        automod_spam_threshold, moderation_log_channel_id, economy_enabled, currency_name,
        currency_symbol, daily_reward_amount, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(community_id) DO UPDATE SET
        prefix = excluded.prefix,
        welcome_enabled = excluded.welcome_enabled,
        welcome_channel_id = excluded.welcome_channel_id,
        welcome_message = excluded.welcome_message,
        auto_role_id = excluded.auto_role_id,
        xp_enabled = excluded.xp_enabled,
        xp_cooldown_seconds = excluded.xp_cooldown_seconds,
        min_xp_per_message = excluded.min_xp_per_message,
        max_xp_per_message = excluded.max_xp_per_message,
        level_announcements = excluded.level_announcements,
        automod_enabled = excluded.automod_enabled,
        automod_block_links = excluded.automod_block_links,
        automod_block_words = excluded.automod_block_words,
        automod_spam_threshold = excluded.automod_spam_threshold,
        moderation_log_channel_id = excluded.moderation_log_channel_id,
        economy_enabled = excluded.economy_enabled,
        currency_name = excluded.currency_name,
        currency_symbol = excluded.currency_symbol,
        daily_reward_amount = excluded.daily_reward_amount,
        updated_at = excluded.updated_at`,
      [
        settings.communityId,
        settings.prefix,
        settings.welcomeEnabled ? 1 : 0,
        settings.welcomeChannelId,
        settings.welcomeMessage,
        settings.autoRoleId,
        settings.xpEnabled ? 1 : 0,
        settings.xpCooldownSeconds,
        settings.minXpPerMessage,
        settings.maxXpPerMessage,
        settings.levelAnnouncements ? 1 : 0,
        settings.automodEnabled ? 1 : 0,
        settings.automodBlockLinks ? 1 : 0,
        JSON.stringify(settings.automodBlockWords || []),
        settings.automodSpamThreshold,
        settings.moderationLogChannelId,
        settings.economyEnabled ? 1 : 0,
        settings.currencyName,
        settings.currencySymbol,
        settings.dailyRewardAmount,
        now,
      ]
    );
  }
}
