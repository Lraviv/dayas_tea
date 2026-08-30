/** Full backup/restore: bundles the entire collection -- every field,
 * plus each tea's photo -- into a single .zip your friend can save
 * wherever they trust (Drive, Files, email to themselves) and load back
 * in later. There's no server, so this file *is* the backup: losing it
 * means losing anything not still on the original phone.
 *
 * The zip holds:
 *   collection.xlsx  -- same shape as the regular "export to Excel"
 *                        feature, plus a "Photo File" column pointing at
 *                        this tea's file under photos/ (blank if none)
 *   photos/<file>     -- the actual photo bytes
 *   manifest.json     -- a version number for forward compatibility
 *
 * Restore uses *replace* semantics, not merge: everything currently in
 * the collection is wiped and rebuilt from the backup. A merge sounds
 * safer, but isn't -- a fresh install already re-seeds the 446-item
 * catalog with blank ratings/photos, and de-duping a merge by name+brand
 * would just match those blank rows and silently discard the very
 * ratings/photos the restore is trying to bring back.
 */

import JSZip from "jszip";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

import { getDb } from "../db/client";
import { listTeas, wipeAllTeas } from "../db/teaRepository";
import { clearAllTeaPhotos, savePhotoFromBase64 } from "./photoStorage";
import { FALLBACK_CATEGORY } from "../types/tea";

const HEADERS = [
  "Name", "Name (Hebrew)",
  "Brand", "Brand (Hebrew)",
  "Series", "Series (Hebrew)",
  "Category", "Rating", "Origin",
  "Ingredients", "Ingredients (Hebrew)",
  "Description", "Description (Hebrew)",
  "Notes", "Photo File", "Added On",
] as const;

const COLLECTION_ENTRY = "collection.xlsx";
const PHOTOS_FOLDER = "photos/";
const MANIFEST_ENTRY = "manifest.json";
const BACKUP_FORMAT_VERSION = 1;

function extensionOf(uri: string): string {
  return uri.split(".").pop()?.split("?")[0] || "jpg";
}

function strOrNull(value: unknown): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed.length ? trimmed : null;
}

/** Build the backup zip in the app's cache directory and return its
 * local file:// uri, ready to hand to Sharing.shareAsync. Always backs
 * up the *whole* collection, ignoring whatever filters the library
 * screen currently has active -- unlike the quick Excel export, this is
 * meant to be a complete safety net. */
export async function createBackupZip(): Promise<string> {
  const { items } = await listTeas({ limit: 100000, offset: 0 });

  const zip = new JSZip();
  const rows: Record<string, string | number>[] = [];

  for (const tea of items) {
    let photoFile = "";
    if (tea.imageUri) {
      const base64 = await FileSystem.readAsStringAsync(tea.imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      photoFile = `${tea.id}.${extensionOf(tea.imageUri)}`;
      zip.file(`${PHOTOS_FOLDER}${photoFile}`, base64, { base64: true });
    }

    rows.push({
      [HEADERS[0]]: tea.name,
      [HEADERS[1]]: tea.nameHe ?? "",
      [HEADERS[2]]: tea.brand ?? "",
      [HEADERS[3]]: tea.brandHe ?? "",
      [HEADERS[4]]: tea.series ?? "",
      [HEADERS[5]]: tea.seriesHe ?? "",
      [HEADERS[6]]: tea.category,
      [HEADERS[7]]: tea.rating ?? "",
      [HEADERS[8]]: tea.origin ?? "",
      [HEADERS[9]]: tea.ingredients ?? "",
      [HEADERS[10]]: tea.ingredientsHe ?? "",
      [HEADERS[11]]: tea.description ?? "",
      [HEADERS[12]]: tea.descriptionHe ?? "",
      [HEADERS[13]]: tea.notes ?? "",
      [HEADERS[14]]: photoFile,
      [HEADERS[15]]: tea.createdAt,
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...HEADERS] });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tea Collection");
  const workbookBase64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
  zip.file(COLLECTION_ENTRY, workbookBase64, { base64: true });

  zip.file(
    MANIFEST_ENTRY,
    JSON.stringify({
      version: BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      count: items.length,
    })
  );

  const zipBase64 = await zip.generateAsync({ type: "base64" });
  const fileName = `dayas-tea-backup-${new Date().toISOString().slice(0, 10)}.zip`;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, zipBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return fileUri;
}

/** Build the backup and hand it to the OS share sheet, same pattern as
 * the existing Excel export. */
export async function exportBackup(): Promise<void> {
  const fileUri = await createBackupZip();
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing is not available on this device.");
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: "application/zip",
    dialogTitle: "Backup Daya's Tea",
    UTI: "public.zip-archive",
  });
}

export interface RestoreResult {
  imported: number;
}

/** Replace the entire collection with the contents of a backup zip
 * (picked via expo-document-picker). See the file-level comment for why
 * this replaces rather than merges. Inserts rows directly (like
 * seedCatalog.ts's bulk import does) rather than through
 * teaRepository.createTea, since a backup row's photo is optional and
 * TeaInput.imageUri isn't -- that constraint exists for the
 * camera-first "add a tea" flow, not bulk/raw imports like this one. */
export async function restoreFromBackupZip(fileUri: string): Promise<RestoreResult> {
  const zipBase64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const zip = await JSZip.loadAsync(zipBase64, { base64: true });

  const workbookEntry = zip.file(COLLECTION_ENTRY);
  if (!workbookEntry) {
    throw new Error("This doesn't look like a Daya's Tea backup (no collection.xlsx inside).");
  }
  const workbookBase64 = await workbookEntry.async("base64");
  const workbook = XLSX.read(workbookBase64, { type: "base64" });
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(workbook.Sheets[sheetName]);

  await clearAllTeaPhotos();
  await wipeAllTeas();

  const db = await getDb();
  let imported = 0;

  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      const name = strOrNull(row[HEADERS[0]]);
      if (!name) continue;

      const id = Crypto.randomUUID();

      let imageUri: string | null = null;
      const photoFile = strOrNull(row[HEADERS[14]]);
      if (photoFile) {
        const photoEntry = zip.file(`${PHOTOS_FOLDER}${photoFile}`);
        if (photoEntry) {
          const photoBase64 = await photoEntry.async("base64");
          imageUri = await savePhotoFromBase64(photoBase64, id, extensionOf(photoFile));
        }
      }

      const ratingRaw = row[HEADERS[7]];
      const rating =
        ratingRaw === "" || ratingRaw == null || Number.isNaN(Number(ratingRaw))
          ? null
          : Number(ratingRaw);

      const createdAt = strOrNull(row[HEADERS[15]]) ?? new Date().toISOString();

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
          $name: name,
          $nameHe: strOrNull(row[HEADERS[1]]),
          $brand: strOrNull(row[HEADERS[2]]),
          $brandHe: strOrNull(row[HEADERS[3]]),
          $series: strOrNull(row[HEADERS[4]]),
          $seriesHe: strOrNull(row[HEADERS[5]]),
          $category: strOrNull(row[HEADERS[6]]) ?? FALLBACK_CATEGORY,
          $ingredients: strOrNull(row[HEADERS[9]]),
          $ingredientsHe: strOrNull(row[HEADERS[10]]),
          $description: strOrNull(row[HEADERS[11]]),
          $descriptionHe: strOrNull(row[HEADERS[12]]),
          $origin: strOrNull(row[HEADERS[8]]),
          $notes: strOrNull(row[HEADERS[13]]),
          $rating: rating,
          $imageUri: imageUri,
          $createdAt: createdAt,
          $updatedAt: new Date().toISOString(),
        }
      );

      imported += 1;
    }
  });

  // A restored tea might use a custom category that doesn't exist in a
  // fresh install's `categories` table (only the defaults get seeded
  // there). Backfill it the same way migration v2 does, so nothing
  // restored is invisible in the filter chips / category picker.
  await db.execAsync(`
    INSERT OR IGNORE INTO categories (name)
    SELECT DISTINCT category FROM teas
    WHERE category IS NOT NULL AND TRIM(category) != '';
  `);

  return { imported };
}
