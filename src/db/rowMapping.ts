import type { Tea, TeaCategory } from "../types/tea";

/** Raw shape of a `teas` row as SQLite returns it (snake_case columns). */
export interface TeaRow {
  id: string;
  name: string;
  name_he: string | null;
  brand: string | null;
  brand_he: string | null;
  series: string | null;
  series_he: string | null;
  category: string;
  ingredients: string | null;
  ingredients_he: string | null;
  description: string | null;
  description_he: string | null;
  origin: string | null;
  notes: string | null;
  rating: number | null;
  image_uri: string | null;
  created_at: string;
  updated_at: string;
}

export function rowToTea(row: TeaRow): Tea {
  return {
    id: row.id,
    name: row.name,
    nameHe: row.name_he,
    brand: row.brand,
    brandHe: row.brand_he,
    series: row.series,
    seriesHe: row.series_he,
    category: row.category as TeaCategory,
    ingredients: row.ingredients,
    ingredientsHe: row.ingredients_he,
    description: row.description,
    descriptionHe: row.description_he,
    origin: row.origin,
    notes: row.notes,
    rating: row.rating,
    imageUri: row.image_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
