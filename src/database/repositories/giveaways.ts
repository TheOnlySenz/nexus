import { DatabaseManager } from "../db";
import { GiveawayRecord, GiveawayEntryRecord } from "../../types/database";

export class GiveawaysRepository {
  constructor(private readonly db: DatabaseManager) {}

  async create(
    communityId: string,
    channelId: string,
    messageId: string,
    prize: string,
    winnerCount: number,
    endsAt: string,
    createdBy: string
  ): Promise<GiveawayRecord> {
    const id = `giveaway_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO giveaways (id, community_id, channel_id, message_id, prize, winner_count, ends_at, created_by, created_at, status, winners)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', '[]')`,
      [id, communityId, channelId, messageId, prize, winnerCount, endsAt, createdBy, now]
    );

    return {
      id,
      community_id: communityId,
      channel_id: channelId,
      message_id: messageId,
      prize,
      winner_count: winnerCount,
      ends_at: endsAt,
      created_by: createdBy,
      created_at: now,
      status: "active",
      winners: "[]",
    };
  }

  async getById(id: string): Promise<GiveawayRecord | undefined> {
    return this.db.get<GiveawayRecord>(`SELECT * FROM giveaways WHERE id = ?`, [id]);
  }

  async getActive(communityId: string): Promise<GiveawayRecord[]> {
    return this.db.all<GiveawayRecord>(
      `SELECT * FROM giveaways WHERE community_id = ? AND status = 'active' ORDER BY ends_at ASC`,
      [communityId]
    );
  }

  async getAllActiveDue(beforeTimeIso: string): Promise<GiveawayRecord[]> {
    return this.db.all<GiveawayRecord>(
      `SELECT * FROM giveaways WHERE status = 'active' AND ends_at <= ?`,
      [beforeTimeIso]
    );
  }

  async addEntry(giveawayId: string, userId: string): Promise<boolean> {
    const now = new Date().toISOString();
    try {
      await this.db.run(
        `INSERT INTO giveaway_entries (giveaway_id, user_id, entered_at) VALUES (?, ?, ?)`,
        [giveawayId, userId, now]
      );
      return true;
    } catch {
      // Primary key constraint violation (already entered)
      return false;
    }
  }

  async getEntries(giveawayId: string): Promise<string[]> {
    const rows = await this.db.all<GiveawayEntryRecord>(
      `SELECT * FROM giveaway_entries WHERE giveaway_id = ?`,
      [giveawayId]
    );
    return rows.map((r) => r.user_id);
  }

  async getEntryCount(giveawayId: string): Promise<number> {
    const res = await this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM giveaway_entries WHERE giveaway_id = ?`,
      [giveawayId]
    );
    return res?.count ?? 0;
  }

  async complete(giveawayId: string, winners: string[]): Promise<void> {
    await this.db.run(
      `UPDATE giveaways SET status = 'ended', winners = ? WHERE id = ?`,
      [JSON.stringify(winners), giveawayId]
    );
  }

  async cancel(giveawayId: string): Promise<void> {
    await this.db.run(`UPDATE giveaways SET status = 'cancelled' WHERE id = ?`, [giveawayId]);
  }
}
