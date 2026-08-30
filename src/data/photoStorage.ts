/** Persists tea bag photos on-device.
 *
 * expo-camera / expo-image-picker hand back a photo living in a temporary
 * cache location that the OS can clear at any time. To keep a photo for
 * as long as its tea record exists, we copy it into a dedicated
 * sub-folder of the app's *document* directory, which persists across
 * app restarts (and is only removed if the app itself is uninstalled).
 */

import * as FileSystem from "expo-file-system/legacy"; // SDK54: old promise API kept under /legacy

const PHOTOS_DIR = `${FileSystem.documentDirectory}tea-photos/`;

async function ensurePhotosDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
}

/** Copy a freshly-captured photo (from expo-camera/expo-image-picker) into
 * permanent app storage and return its stable file:// URI. Call this
 * right after capture, before the temp file can be garbage-collected. */
export async function saveTeaPhoto(sourceUri: string, teaId: string): Promise<string> {
  await ensurePhotosDir();
  const extension = sourceUri.split(".").pop()?.split("?")[0] || "jpg";
  const destUri = `${PHOTOS_DIR}${teaId}.${extension}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  return destUri;
}

/** Remove a tea's stored photo (call when deleting the tea, or when
 * replacing its photo with a new one). Safe to call even if the file is
 * already gone. */
export async function deleteTeaPhoto(photoUri: string | null): Promise<void> {
  if (!photoUri) return;
  const info = await FileSystem.getInfoAsync(photoUri);
  if (info.exists) {
    await FileSystem.deleteAsync(photoUri, { idempotent: true });
  }
}

/** Write a photo out of a backup zip's base64 content into permanent app
 * storage, mirroring saveTeaPhoto -- the only difference is the source is
 * already-decoded base64 (from JSZip) rather than a source file uri. */
export async function savePhotoFromBase64(
  base64: string,
  teaId: string,
  extension: string
): Promise<string> {
  await ensurePhotosDir();
  const destUri = `${PHOTOS_DIR}${teaId}.${extension}`;
  await FileSystem.writeAsStringAsync(destUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return destUri;
}

/** Delete every stored tea photo. Used when restoring a backup with
 * replace semantics -- the whole photo folder is cleared before the
 * backup's own photos are written back in. */
export async function clearAllTeaPhotos(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (info.exists) {
    await FileSystem.deleteAsync(PHOTOS_DIR, { idempotent: true });
  }
  await ensurePhotosDir();
}
