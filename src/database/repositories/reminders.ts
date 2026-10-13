import { DatabaseManager } from "../db";
import { ReminderRecord } from "../../types/database";

export class RemindersRepository {
  constructor(private readonly db: DatabaseManager) {}

  async createReminder(reminder: ReminderRecord): Promise<void> {
    await this.db.run(
      `INSERT INTO reminders (id, community_id, channel_id, user_id, message, remind_at, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reminder.id,
        reminder.community_id,
        reminder.channel_id,
        reminder.user_id,
        reminder.message,
        reminder.remind_at,
        reminder.created_at,
        reminder.status,
      ]
    );
  }

  async getPendingReminders(dueBefore: string): Promise<ReminderRecord[]> {
    return this.db.all<ReminderRecord>(
      "SELECT * FROM reminders WHERE status = 'pending' AND remind_at <= ? ORDER BY remind_at ASC",
      [dueBefore]
    );
  }

  async markDelivered(id: string): Promise<void> {
    await this.db.run("UPDATE reminders SET status = 'delivered' WHERE id = ?", [id]);
  }

  async cancelReminder(id: string): Promise<void> {
    await this.db.run("UPDATE reminders SET status = 'cancelled' WHERE id = ?", [id]);
  }

  async getUserReminders(communityId: string, userId: string): Promise<ReminderRecord[]> {
    return this.db.all<ReminderRecord>(
      "SELECT * FROM reminders WHERE community_id = ? AND user_id = ? AND status = 'pending' ORDER BY remind_at ASC",
      [communityId, userId]
    );
  }
}
