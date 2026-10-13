import sqlite3 from "sqlite3";
import { CREATE_TABLES_SQL } from "./schema";
import { Logger } from "../core/logger";
import { DatabaseError } from "../core/errors";

const logger = new Logger("Database");

export class DatabaseManager {
  private db: sqlite3.Database | null = null;
  private isInitialized = false;

  constructor(private readonly filename: string) {}

  async initialize(): Promise<void> {
    if (this.isInitialized && this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      logger.info(`Opening SQLite database at: ${this.filename}`);
      this.db = new sqlite3.Database(this.filename, (err) => {
        if (err) {
          logger.error("Failed to open SQLite database", err);
          return reject(new DatabaseError(`Failed to open SQLite database: ${err.message}`, err));
        }

        // Enable WAL mode and foreign keys for high performance and integrity
        this.db!.serialize(() => {
          this.db!.run("PRAGMA journal_mode = WAL;");
          this.db!.run("PRAGMA foreign_keys = ON;");
          this.db!.exec(CREATE_TABLES_SQL, (schemaErr) => {
            if (schemaErr) {
              logger.error("Failed to execute database schema migrations", schemaErr);
              return reject(new DatabaseError(`Failed to apply schema: ${schemaErr.message}`, schemaErr));
            }

            this.db!.run("ALTER TABLE community_settings ADD COLUMN confession_channel_id TEXT;", () => {});
            this.db!.run("ALTER TABLE community_settings ADD COLUMN starboard_channel_id TEXT;", () => {});
            this.db!.run("ALTER TABLE community_settings ADD COLUMN starboard_threshold INTEGER NOT NULL DEFAULT 3;", () => {});

            this.isInitialized = true;
            logger.info("SQLite database schema initialized successfully");
            resolve();
          });
        });
      });
    });
  }

  async run(sql: string, params: unknown[] = []): Promise<{ lastID: number; changes: number }> {
    this.ensureReady();
    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, function (this: sqlite3.RunResult, err: Error | null) {
        if (err) {
          logger.error(`Error executing SQL: ${sql}`, err);
          return reject(new DatabaseError(err.message, err));
        }
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    this.ensureReady();
    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err: Error | null, row: unknown) => {
        if (err) {
          logger.error(`Error executing SQL get: ${sql}`, err);
          return reject(new DatabaseError(err.message, err));
        }
        resolve(row as T | undefined);
      });
    });
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    this.ensureReady();
    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err: Error | null, rows: unknown[]) => {
        if (err) {
          logger.error(`Error executing SQL all: ${sql}`, err);
          return reject(new DatabaseError(err.message, err));
        }
        resolve((rows || []) as T[]);
      });
    });
  }

  async exec(sql: string): Promise<void> {
    this.ensureReady();
    return new Promise((resolve, reject) => {
      this.db!.exec(sql, (err: Error | null) => {
        if (err) {
          logger.error("Error executing raw SQL batch", err);
          return reject(new DatabaseError(err.message, err));
        }
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          logger.error("Error closing SQLite database", err);
          return reject(new DatabaseError(err.message, err));
        }
        this.db = null;
        this.isInitialized = false;
        logger.info("SQLite database connection closed successfully");
        resolve();
      });
    });
  }

  private ensureReady(): void {
    if (!this.db || !this.isInitialized) {
      throw new DatabaseError("Database is not initialized. Call initialize() before executing queries.");
    }
  }
}
