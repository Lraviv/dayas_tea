/** Opens (once) the local SQLite database and ensures it's migrated. */

import * as SQLite from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";

import { DB_NAME, runMigrations } from "./schema";

let dbPromise: Promise<SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      // WAL mode must be set outside of any transaction (SQLite rejects
      // changing journal mode mid-transaction), so it happens here, before
      // runMigrations opens its own transaction for each pending migration.
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await runMigrations(db);
      return db;
    })();
  }
  return dbPromise;
}
