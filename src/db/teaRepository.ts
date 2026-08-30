/** Data access layer for the local tea collection -- the on-device
 * equivalent of the FastAPI /teas routes, but querying SQLite directly. */

import * as Crypto from "expo-crypto";
import type { SQLiteBindParams } from "expo-sqlite";

import { getDb } from "./client";
import { rowToTea, type TeaRow } from "./rowMapping";
import type { Tea, TeaInput, TeaListResult, TeaPatch, TeaQuery, SortField } from "../types/tea";

const SORTABLE_COLUMNS: Record<SortField, string> = {
  name: "name",
  brand: "brand",
  category: "category",
  rating: "rating",
  createdAt: "created_at",
};

function nowIso(): string {
  return new Date().toISOString();
}

export async function listTeas(query: TeaQuery = {}): Promise<TeaListResult> {
  const db = await getDb();

  const where: string[] = [];
  const params: SQLiteBindParams = {};

  if (query.q && query.q.trim()) {
    const like = `%${query.q.trim()}%`;
    const searchColumns = [
      "name",
      "name_he",
      "brand",
      "brand_he",
      "series",
      "series_he",
      "ingredients",
      "ingredients_he",
      "description",
      "description_he",
      "origin",
      "notes",
    ];
    where.push(`(${searchColumns.map((c) => `${c} LIKE $q`).join(" OR ")})`);
    params.$q = like;
  }
  if (query.category) {
    where.push("category = $category");
    params.$category = query.category;
  }
  if (query.minRating) {
    where.push("rating >= $minRating");
    params.$minRating = query.minRating;
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM teas ${whereClause}`,
    params
  );
  const total = totalRow?.count ?? 0;

  const sortColumn = SORTABLE_COLUMNS[query.sortBy ?? "createdAt"] ?? "created_at";
  const order = query.order === "asc" ? "ASC" : "DESC";
  const limit = query.limit ?? 50;
  const offset = query.offset ?? 0;

  const rows = await db.getAllAsync<TeaRow>(
    `SELECT * FROM teas ${whereClause} ORDER BY ${sortColumn} ${order} LIMIT $limit OFFSET $offset`,
    { ...params, $limit: limit, $offset: offset }
  );

  return { total, items: rows.map(rowToTea) };
}

export async function getTea(id: string): Promise<Tea | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TeaRow>("SELECT * FROM teas WHERE id = $id", { $id: id });
  return row ? rowToTea(row) : null;
}

export async function createTea(input: TeaInput, presetId?: string): Promise<Tea> {
  const db = await getDb();
  const id = presetId ?? Crypto.randomUUID();
  const timestamp = nowIso();

  await db.runAsync(
    `INSERT INTO teas (
       id, name, name_he, brand, brand_he, series, series_he, category,
       ingredients, ingredients_he, description, description_he, origin,
       notes, rating, image_uri, created_at, updated_at
     ) VALUES (
       $id, $name, $nameHe, $brand, $brandHe, $series, $seriesHe, $category,
       $ingredients, $ingredientsHe, $description, $descriptionHe, $origin,
       $notes, $rating, $imageUri, $createdAt, $updatedAt
     )`,
    {
      $id: id,
      $name: input.name,
      $nameHe: input.nameHe ?? null,
      $brand: input.brand ?? null,
      $brandHe: input.brandHe ?? null,
      $series: input.series ?? null,
      $seriesHe: input.seriesHe ?? null,
      $category: input.category,
      $ingredients: input.ingredients ?? null,
      $ingredientsHe: input.ingredientsHe ?? null,
      $description: input.description ?? null,
      $descriptionHe: input.descriptionHe ?? null,
      $origin: input.origin ?? null,
      $notes: input.notes ?? null,
      $rating: input.rating ?? null,
      $imageUri: input.imageUri,
      $createdAt: timestamp,
      $updatedAt: timestamp,
    }
  );

  const created = await getTea(id);
  if (!created) {
    throw new Error("Failed to read back newly created tea.");
  }
  return created;
}

export async function updateTea(id: string, patch: TeaPatch): Promise<Tea> {
  const db = await getDb();
  const existing = await getTea(id);
  if (!existing) {
    throw new Error(`Tea ${id} not found.`);
  }

  const columnMap: Record<keyof TeaPatch, string> = {
    name: "name",
    nameHe: "name_he",
    brand: "brand",
    brandHe: "brand_he",
    series: "series",
    seriesHe: "series_he",
    category: "category",
    ingredients: "ingredients",
    ingredientsHe: "ingredients_he",
    description: "description",
    descriptionHe: "description_he",
    origin: "origin",
    notes: "notes",
    rating: "rating",
    imageUri: "image_uri",
  };

  const sets: string[] = [];
  const params: SQLiteBindParams = { $id: id, $updatedAt: nowIso() };

  for (const [key, column] of Object.entries(columnMap) as [keyof TeaPatch, string][]) {
    if (key in patch) {
      const paramName = `$${key}`;
      sets.push(`${column} = ${paramName}`);
      params[paramName] = patch[key] ?? null;
    }
  }

  if (sets.length === 0) {
    return existing;
  }

  sets.push("updated_at = $updatedAt");
  await db.runAsync(`UPDATE teas SET ${sets.join(", ")} WHERE id = $id`, params);

  const updated = await getTea(id);
  if (!updated) {
    throw new Error(`Tea ${id} disappeared during update.`);
  }
  return updated;
}

export async function deleteTea(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM teas WHERE id = $id", { $id: id });
  // Deleting the on-disk photo file (if any) is the caller's job -- see
  // src/data/photoStorage.ts's deleteTeaPhoto, so this stays a pure DB op.
}

/** Delete every tea row. Used by backup restore (replace semantics --
 * see src/data/backup.ts) so a restore always leaves the collection
 * exactly matching the backup, rather than merging with whatever was
 * already on the device (which could silently drop restored ratings and
 * photos onto rows the fresh-install catalog seed already created).
 * Same as deleteTea, this is a pure DB op -- clearing photo files is the
 * caller's job (see photoStorage.ts's clearAllTeaPhotos). */
export async function wipeAllTeas(): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM teas");
}

export async function countTeas(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM teas");
  return row?.count ?? 0;
}
