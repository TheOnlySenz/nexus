import { DatabaseManager } from "../db";
import { EconomyAccountRecord } from "../../types/database";
import { NexusError } from "../../core/errors";

export class EconomyRepository {
  constructor(private readonly db: DatabaseManager) {}

  async getAccount(communityId: string, userId: string): Promise<EconomyAccountRecord> {
    const existing = await this.db.get<EconomyAccountRecord>(
      `SELECT * FROM economy_accounts WHERE community_id = ? AND user_id = ?`,
      [communityId, userId]
    );

    if (existing) return existing;

    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO economy_accounts (community_id, user_id, balance, last_daily_at, created_at, updated_at)
       VALUES (?, ?, 0, NULL, ?, ?)`,
      [communityId, userId, now, now]
    );

    return {
      community_id: communityId,
      user_id: userId,
      balance: 0,
      last_daily_at: null,
      created_at: now,
      updated_at: now,
    };
  }

  async getBalance(communityId: string, userId: string): Promise<number> {
    const account = await this.getAccount(communityId, userId);
    return account.balance;
  }

  async addBalance(communityId: string, userId: string, amount: number): Promise<number> {
    if (amount <= 0) return this.getBalance(communityId, userId);

    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO economy_accounts (community_id, user_id, balance, last_daily_at, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, ?)
       ON CONFLICT(community_id, user_id) DO UPDATE SET
         balance = balance + excluded.balance,
         updated_at = excluded.updated_at`,
      [communityId, userId, amount, now, now]
    );

    return this.getBalance(communityId, userId);
  }

  async deductBalance(communityId: string, userId: string, amount: number): Promise<number> {
    if (amount <= 0) return this.getBalance(communityId, userId);

    const account = await this.getAccount(communityId, userId);
    if (account.balance < amount) {
      throw new NexusError("Insufficient balance for this transaction.");
    }

    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE economy_accounts SET balance = balance - ?, updated_at = ? WHERE community_id = ? AND user_id = ? AND balance >= ?`,
      [amount, now, communityId, userId, amount]
    );

    return this.getBalance(communityId, userId);
  }

  async claimDaily(
    communityId: string,
    userId: string,
    rewardAmount: number
  ): Promise<{ success: boolean; newBalance: number; nextClaimMs: number }> {
    const account = await this.getAccount(communityId, userId);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (account.last_daily_at) {
      const lastClaimTime = new Date(account.last_daily_at).getTime();
      const elapsed = now - lastClaimTime;
      if (elapsed < oneDayMs) {
        return {
          success: false,
          newBalance: account.balance,
          nextClaimMs: oneDayMs - elapsed,
        };
      }
    }

    const nowIso = new Date(now).toISOString();
    const newBalance = account.balance + rewardAmount;

    await this.db.run(
      `UPDATE economy_accounts
       SET balance = ?, last_daily_at = ?, updated_at = ?
       WHERE community_id = ? AND user_id = ?`,
      [newBalance, nowIso, nowIso, communityId, userId]
    );

    return {
      success: true,
      newBalance,
      nextClaimMs: oneDayMs,
    };
  }
}
