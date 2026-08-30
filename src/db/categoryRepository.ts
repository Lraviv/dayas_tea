/** Data access for the user-editable category list (src/db/schema.ts's
 * migration v2). Categories are just names in a lookup table now -- add
 * your own from the Manage Categories screen, same as the original
 * defaults (Green, Black, ...). */

import { getDb } from "./client";
import { FALLBACK_CATEGORY } from "../types/tea";

/** All categories, alphabetical, with `Other` always sorted first since
 * it's the permanent fallback every other category can fall back to. */
export async function listCategories(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM categories ORDER BY name COLLATE NOCASE ASC"
  );
  const names = rows.map((r) => r.name);
  return [
    ...names.filter((n) => n === FALLBACK_CATEGORY),
    ...names.filter((n) => n !== FALLBACK_CATEGORY),
  ];
}

/** Add a new category. Trims whitespace, rejects blank names, and is a
 * no-op (not an error) if the name already exists. */
export async function addCategory(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Category name can't be empty.");
  }
  const db = await getDb();
  await db.runAsync("INSERT OR IGNORE INTO categories (name) VALUES ($name)", {
    $name: trimmed,
  });
}

/** Remove a category. Any tea currently using it is reassigned to
 * `Other` first, so nothing is left pointing at a category that no
 * longer exists. `Other` itself can't be deleted -- it's the permanent
 * fallback. Returns how many teas were reassigned. */
export async function deleteCategory(name: string): Promise<{ reassigned: number }> {
  if (name === FALLBACK_CATEGORY) {
    throw new Error(`"${FALLBACK_CATEGORY}" can't be deleted -- it's the default category.`);
  }
  const db = await getDb();

  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM teas WHERE category = $name",
    { $name: name }
  );
  const reassigned = row?.count ?? 0;

  await db.withTransactionAsync(async () => {
    await db.runAsync("UPDATE teas SET category = $fallback WHERE category = $name", {
      $fallback: FALLBACK_CATEGORY,
      $name: name,
    });
    await db.runAsync("DELETE FROM categories WHERE name = $name", { $name: name });
  });

  return { reassigned };
}

/** How many teas currently use each category -- shown next to each row
 * on the Manage Categories screen so deleting one isn't a surprise. */
export async function getCategoryUsageCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ category: string; count: number }>(
    "SELECT category, COUNT(*) as count FROM teas GROUP BY category"
  );
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.category] = row.count;
  }
  return counts;
}
