/** Client-side Excel export -- there's no server to generate this
 * anymore, so we build the workbook on-device with SheetJS and hand it
 * to the OS share sheet (AirDrop, Files, email, etc.) via expo-sharing. */

import * as FileSystem from "expo-file-system/legacy"; // SDK54: old promise API kept under /legacy
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

import { listTeas } from "../db/teaRepository";
import type { TeaQuery } from "../types/tea";

const HEADERS = [
  "Name", "Name (Hebrew)",
  "Brand", "Brand (Hebrew)",
  "Series", "Series (Hebrew)",
  "Category", "Rating", "Origin",
  "Ingredients", "Ingredients (Hebrew)",
  "Description", "Description (Hebrew)",
  "Notes", "Has Photo", "Added On",
] as const;

/** Export the current (optionally filtered) collection to .xlsx and open
 * the share sheet. Reuses whatever search/filter the library screen has
 * active, so "export what I'm looking at" works for free. */
export async function exportTeasToXlsx(query: TeaQuery = {}): Promise<void> {
  const { items } = await listTeas({ ...query, limit: 100000, offset: 0 });

  const rows = items.map((tea) => ({
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
    [HEADERS[14]]: tea.imageUri ? "Yes" : "No",
    [HEADERS[15]]: new Date(tea.createdAt).toLocaleString(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...HEADERS] });
  worksheet["!cols"] = [
    { wch: 24 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    { wch: 12 }, { wch: 8 }, { wch: 16 }, { wch: 30 }, { wch: 30 }, { wch: 30 },
    { wch: 30 }, { wch: 30 }, { wch: 10 }, { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tea Collection");

  const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
  const fileName = `dayas-tea-collection-${new Date().toISOString().slice(0, 10)}.xlsx`;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "Export Tea Collection",
    UTI: "org.openxmlformats.spreadsheetml.sheet",
  });
}
