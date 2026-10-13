import { DatabaseManager } from "../db";
import { ReactionRoleRecord } from "../../types/database";

export class ReactionRolesRepository {
  constructor(private readonly db: DatabaseManager) {}

  async create(
    communityId: string,
    messageId: string,
    channelId: string,
    shortcode: string,
    roleId: string,
    createdBy: string
  ): Promise<ReactionRoleRecord> {
    const id = `rr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO reaction_roles (id, community_id, message_id, channel_id, shortcode, role_id, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, communityId, messageId, channelId, shortcode, roleId, createdBy, now]
    );

    return {
      id,
      community_id: communityId,
      message_id: messageId,
      channel_id: channelId,
      shortcode,
      role_id: roleId,
      created_by: createdBy,
      created_at: now,
    };
  }

  async getByMessageAndEmoji(
    communityId: string,
    messageId: string,
    shortcode: string
  ): Promise<ReactionRoleRecord | undefined> {
    return this.db.get<ReactionRoleRecord>(
      `SELECT * FROM reaction_roles WHERE community_id = ? AND message_id = ? AND shortcode = ?`,
      [communityId, messageId, shortcode]
    );
  }

  async listForMessage(communityId: string, messageId: string): Promise<ReactionRoleRecord[]> {
    return this.db.all<ReactionRoleRecord>(
      `SELECT * FROM reaction_roles WHERE community_id = ? AND message_id = ?`,
      [communityId, messageId]
    );
  }

  async listAll(communityId: string): Promise<ReactionRoleRecord[]> {
    return this.db.all<ReactionRoleRecord>(
      `SELECT * FROM reaction_roles WHERE community_id = ? ORDER BY created_at DESC`,
      [communityId]
    );
  }

  async delete(communityId: string, id: string): Promise<boolean> {
    const res = await this.db.run(
      `DELETE FROM reaction_roles WHERE community_id = ? AND id = ?`,
      [communityId, id]
    );
    return res.changes > 0;
  }
}
