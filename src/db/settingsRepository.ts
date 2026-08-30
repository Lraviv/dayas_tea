/** Generic key-value settings, stored in the existing app_meta table
 * (already used by seedCatalog.ts's one-time-seed flag) rather than
 * adding a whole new storage mechanism for a couple of small
 * preferences. */

import { getDb } from "./client";

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = $key",
    { $key: key }
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO app_meta (key, value) VALUES ($key, $value) ON CONFLICT(key) DO UPDATE SET value = $value",
    { $key: key, $value: value }
  );
}

export const PAGE_SIZE_KEY = "library_page_size";
export const PAGE_SIZE_OPTIONS = [50, 100, 200] as const;
/** "All" isn't infinite -- it's just a fetch large enough to cover any
 * collection this app is realistically going to hold, same cap the
 * export/backup features already use for "everything". */
export const PAGE_SIZE_ALL = 100000;
export const DEFAULT_PAGE_SIZE = 200;

export async function getPageSize(): Promise<number> {
  const stored = await getSetting(PAGE_SIZE_KEY);
  const parsed = stored ? Number(stored) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PAGE_SIZE;
}

export async function setPageSize(size: number): Promise<void> {
  await setSetting(PAGE_SIZE_KEY, String(size));
}
