/** Read-only aggregate queries backing the Statistics screen -- separate
 * from teaRepository.ts since these are all GROUP BY/aggregate reads,
 * never part of the CRUD path. */

import { getDb } from "./client";

export interface CollectionStats {
  total: number;
  rated: number;
  withPhoto: number;
  averageRating: number | null;
}

/** Headline numbers: how many teas total, how many have been rated (vs.
 * still sitting unrated from the catalog import), how many have an
 * actual photo, and the average of whatever ratings exist. */
export async function getCollectionStats(): Promise<CollectionStats> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    total: number;
    rated: number;
    with_photo: number;
    avg_rating: number | null;
  }>(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN rating IS NOT NULL THEN 1 ELSE 0 END) as rated,
      SUM(CASE WHEN image_uri IS NOT NULL THEN 1 ELSE 0 END) as with_photo,
      AVG(rating) as avg_rating
    FROM teas
  `);

  return {
    total: row?.total ?? 0,
    rated: row?.rated ?? 0,
    withPhoto: row?.with_photo ?? 0,
    averageRating: row?.avg_rating ?? null,
  };
}

export interface NamedCount {
  name: string;
  count: number;
}

/** How many teas fall into each category, most-common first. */
export async function getCategoryBreakdown(): Promise<NamedCount[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ category: string; count: number }>(`
    SELECT category, COUNT(*) as count
    FROM teas
    GROUP BY category
    ORDER BY count DESC, category COLLATE NOCASE ASC
  `);
  return rows.map((r) => ({ name: r.category, count: r.count }));
}

/** How many teas come from each brand, most-common first. Teas with no
 * brand set are grouped under "Unknown" rather than dropped. */
export async function getBrandBreakdown(): Promise<NamedCount[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ brand: string; count: number }>(`
    SELECT COALESCE(NULLIF(TRIM(brand), ''), 'Unknown') as brand, COUNT(*) as count
    FROM teas
    GROUP BY brand
    ORDER BY count DESC, brand COLLATE NOCASE ASC
  `);
  return rows.map((r) => ({ name: r.brand, count: r.count }));
}
