/**
 * Persistent storage that writes to the app data directory.
 *
 * localStorage lives inside the WebView2 data folder and can be wiped
 * when the NSIS installer updates the application.  This module
 * mirrors the critical keys to a JSON file under $APPDATA so the data
 * survives across updates.
 *
 * On startup the store calls `restoreIfNeeded()` which copies values
 * back into localStorage when they are missing (i.e. after an update
 * that cleared WebView2 data).
 */

import { isTauriRuntime } from "@/utils/runtime";

const STORAGE_FILENAME = "app-state.json";

/** Keys that we persist to the filesystem */
const PERSISTED_KEYS = [
  "xmlviewer-recent",
  "xmlviewer-recent-cache",
  "xmlviewer-theme",
  "xmlviewer-max-recent",
  "xmlviewer-download-dir",
  "xmlviewer-group-by-emitente",
  "xmlviewer-show-ibs-cbs",
  "xmlviewer-selected-cert",
] as const;

type PersistedKey = (typeof PERSISTED_KEYS)[number];
type PersistedData = Partial<Record<PersistedKey, string>>;

let appDataDir: string | null = null;
let writeQueue: Promise<void> = Promise.resolve();

/** App data directory, always ending with a path separator. */
async function getStoragePath(): Promise<string | null> {
  if (!isTauriRuntime()) return null;

  if (appDataDir) return appDataDir;

  try {
    const { appDataDir: getAppDataDir } = await import("@tauri-apps/api/path");
    const dir = await getAppDataDir();
    const separator = dir.includes("\\") ? "\\" : "/";
    appDataDir = /[\\/]$/.test(dir) ? dir : `${dir}${separator}`;
    return appDataDir;
  } catch {
    return null;
  }
}

/**
 * Older versions concatenated the file name without a separator, which
 * wrote `<...>/com.xmlviewer.brapp-state.json` beside the app folder.
 */
function legacyStoragePath(dir: string): string {
  return `${dir.replace(/[\\/]+$/, "")}${STORAGE_FILENAME}`;
}

async function readStorageFile(): Promise<PersistedData | null> {
  const dir = await getStoragePath();
  if (!dir) return null;

  const { readTextFile } = await import("@tauri-apps/plugin-fs");
  let raw: string;
  try {
    raw = await readTextFile(`${dir}${STORAGE_FILENAME}`);
  } catch {
    try {
      raw = await readTextFile(legacyStoragePath(dir));
    } catch {
      return null;
    }
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const data: PersistedData = {};
      for (const key of PERSISTED_KEYS) {
        const value = (parsed as Record<string, unknown>)[key];
        if (typeof value === "string") {
          data[key] = value;
        }
      }
      return data;
    }
  } catch {
    // Corrupted file — that's fine.
  }
  return null;
}

async function writeStorageFile(data: PersistedData): Promise<void> {
  const dir = await getStoragePath();
  if (!dir) return;

  try {
    const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");

    // Ensure the directory exists
    try {
      await mkdir(dir, { recursive: true });
    } catch {
      // Directory may already exist
    }

    await writeTextFile(`${dir}${STORAGE_FILENAME}`, JSON.stringify(data));
  } catch {
    // Silently fail — localStorage is still the primary source during
    // normal operation, so the app keeps working.
  }
}

/**
 * Restore localStorage from the persistent file when keys are missing.
 * Call this once during app startup.
 */
interface RestoreOptions {
  writeBack?: boolean;
}

export async function restoreIfNeeded({
  writeBack = true,
}: RestoreOptions = {}): Promise<void> {
  if (!isTauriRuntime()) return;

  const missingKeys = PERSISTED_KEYS.filter(
    (key) => localStorage.getItem(key) === null,
  );

  if (missingKeys.length === 0) {
    return;
  }

  const stored = await readStorageFile();
  if (stored === null) {
    return;
  }

  for (const key of missingKeys) {
    const value = stored[key];
    if (typeof value === "string") {
      localStorage.setItem(key, value);
    }
  }

  if (writeBack) {
    await persistToFile();
  }
}

/**
 * Persist current localStorage values to the filesystem.
 * Call this after any change to the persisted keys.
 */
export async function persistToFile(): Promise<void> {
  if (!isTauriRuntime()) return;

  const data: PersistedData = {};
  for (const key of PERSISTED_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      data[key] = value;
    }
  }

  writeQueue = writeQueue.then(
    () => writeStorageFile(data),
    () => writeStorageFile(data),
  );
  await writeQueue;
}
