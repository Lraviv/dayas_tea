/** Shared types for the local tea collection store. Mirrors the shape the
 * backend design used, minus anything cloud-specific (no image_public_id,
 * image_url is a local file:// URI instead of a Cloudinary URL). */

/** Starting set of categories, seeded into the `categories` table on
 * first install (migration v2). Categories are user-editable from there
 * on (see src/db/categoryRepository.ts + the Manage Categories screen),
 * so this list is just the default -- not an exhaustive type anymore. */
export const DEFAULT_CATEGORIES = [
  "Green",
  "Black",
  "White",
  "Oolong",
  "Herbal",
  "Pu-erh",
  "Rooibos",
  "Chai",
  "Other",
] as const;

/** A category is just whatever's in the `categories` table -- a plain
 * string, not a fixed union, since the user can add/remove their own. */
export type TeaCategory = string;

/** The one category that always exists and can't be deleted -- the
 * fallback a tea's category is reassigned to when its own category is
 * removed. */
export const FALLBACK_CATEGORY: TeaCategory = "Other";

export interface Tea {
  id: string;
  name: string;
  nameHe: string | null;
  brand: string | null;
  brandHe: string | null;
  series: string | null;
  seriesHe: string | null;
  category: TeaCategory;
  ingredients: string | null;
  ingredientsHe: string | null;
  description: string | null;
  descriptionHe: string | null;
  origin: string | null;
  notes: string | null;
  rating: number | null; // 1-5, or null if not yet rated
  imageUri: string | null; // local file:// URI, or null until photographed
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** Fields the user supplies when adding a tea by hand (camera -> form flow).
 * imageUri is required here: the product flow always starts with a photo. */
export interface TeaInput {
  name: string;
  nameHe?: string | null;
  brand?: string | null;
  brandHe?: string | null;
  series?: string | null;
  seriesHe?: string | null;
  category: TeaCategory;
  ingredients?: string | null;
  ingredientsHe?: string | null;
  description?: string | null;
  descriptionHe?: string | null;
  origin?: string | null;
  notes?: string | null;
  rating?: number | null;
  imageUri: string;
}

export type TeaPatch = Partial<Omit<TeaInput, "imageUri">> & { imageUri?: string | null };

export type SortField = "name" | "brand" | "category" | "rating" | "createdAt";
export type SortOrder = "asc" | "desc";

export interface TeaQuery {
  q?: string;
  category?: TeaCategory;
  minRating?: number;
  sortBy?: SortField;
  order?: SortOrder;
  limit?: number;
  offset?: number;
}

export interface TeaListResult {
  total: number;
  items: Tea[];
}
