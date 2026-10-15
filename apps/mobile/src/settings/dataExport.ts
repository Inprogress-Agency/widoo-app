import type { MyDataExport } from '@widoo/shared';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** « widoo-donnees-2026-10-15.json », the day of the phone (Ecrans › E-19, D-063). */
export function exportFileName(today: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const day = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  return `widoo-donnees-${day}.json`;
}

// In the cache of the app, its own folder: nothing else of the app is ever shared from it.
const folder = () => new Directory(Paths.cache, 'data-export');

/** Removes the file of a previous export: the account's data stays on the phone no longer. */
function clearFolder() {
  const directory = folder();
  if (directory.exists) {
    directory.delete();
  }
}

/**
 * Writes the export in a file and opens the share sheet of the phone on it. On iOS the sheet
 * answers when it closes, and the file goes at once; on Android the app chosen may read it
 * later, so it stays in the cache until the next export.
 */
export async function shareDataExport(data: MyDataExport, today = new Date()): Promise<void> {
  clearFolder();
  const directory = folder();
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, exportFileName(today));
  file.write(JSON.stringify(data, null, 2));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: file.name,
  });
  if (Platform.OS === 'ios') {
    clearFolder();
  }
}
