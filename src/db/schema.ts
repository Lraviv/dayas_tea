/** SQLite schema + versioned migrations for the local tea database.
 *
 * There's no server here, so instead of Alembic we keep a small ordered
 * list of migrations and drive them off SQLite's built-in `user_version`
 * pragma -- each entry runs once, in order, the first time the app opens
 * on a device that hasn't seen it yet.
 */

import type { SQLiteDatabase } from "expo-sqlite";

import { DEFAULT_CATEGORIES } from "../types/tea";

export const DB_NAME = "dayas_tea.db";

type Migration = {
  version: number;
  run: (db: SQLiteDatabase) => Promise<void>;
};

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    run: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS teas (
          id             TEXT PRIMARY KEY NOT NULL,
          name           TEXT NOT NULL,
          name_he        TEXT,
          brand          TEXT,
          brand_he       TEXT,
          series         TEXT,
          series_he      TEXT,
          category       TEXT NOT NULL DEFAULT 'Other',
          ingredients    TEXT,
          ingredients_he TEXT,
          description    TEXT,
          description_he TEXT,
          origin         TEXT,
          notes          TEXT,
          rating         INTEGER CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
          image_uri      TEXT,
          created_at     TEXT NOT NULL,
          updated_at     TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_teas_name ON teas(name);
        CREATE INDEX IF NOT EXISTS idx_teas_brand ON teas(brand);
        CREATE INDEX IF NOT EXISTS idx_teas_category ON teas(category);
        CREATE INDEX IF NOT EXISTS idx_teas_rating ON teas(rating);

        CREATE TABLE IF NOT EXISTS app_meta (
          key   TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
    },
  },
  {
    // Categories become user-editable (add/remove from the Manage
    // Categories screen) instead of a hardcoded list. Seed with the
    // original defaults, then also pick up any category value already
    // sitting on a tea row (covers the bundled catalog import) so
    // nothing already in use silently disappears from the filter list.
    version: 2,
    run: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS categories (
          name TEXT PRIMARY KEY NOT NULL
        );
      `);

      for (const name of DEFAULT_CATEGORIES) {
        await db.runAsync("INSERT OR IGNORE INTO categories (name) VALUES ($name)", {
          $name: name,
        });
      }

      await db.execAsync(`
        INSERT OR IGNORE INTO categories (name)
        SELECT DISTINCT category FROM teas
        WHERE category IS NOT NULL AND TRIM(category) != '';
      `);
    },
  },
];

/** Run any migrations newer than the DB's current user_version. Safe to
 * call on every app start. */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  let currentVersion = row?.user_version ?? 0;

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion).sort(
    (a, b) => a.version - b.version
  );

  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await migration.run(db);
    });
    currentVersion = migration.version;
    await db.execAsync(`PRAGMA user_version = ${currentVersion}`);
  }
}
