import { DatabaseManager } from "../db";
import { StarboardRecord } from "../../types/database";

export class StarboardRepository {
  constructor(private readonly db: DatabaseManager) {}

  async getStarboardMessage(
    communityId: string,
    originalMessageId: string
  ): Promise<StarboardRecord | null> {
    const row = await this.db.get<StarboardRecord>(
      "SELECT * FROM starboard_messages WHERE community_id = ? AND original_message_id = ?",
      [communityId, originalMessageId]
    );
    return row || null;
  }

  async createStarboardMessage(record: StarboardRecord): Promise<void> {
    await this.db.run(
      `INSERT INTO starboard_messages (
        community_id, original_message_id, starboard_message_id, channel_id, author_id, star_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        record.community_id,
        record.original_message_id,
        record.starboard_message_id,
        record.channel_id,
        record.author_id,
        record.star_count,
        record.created_at,
      ]
    );
  }

  async updateStarCount(
    communityId: string,
    originalMessageId: string,
    starCount: number
  ): Promise<void> {
    await this.db.run(
      "UPDATE starboard_messages SET star_count = ? WHERE community_id = ? AND original_message_id = ?",
      [starCount, communityId, originalMessageId]
    );
  }
}
