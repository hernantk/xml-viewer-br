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
] as const;

type PersistedData = Partial<Record<string, string>>;

let appDataDir: string | null = null;

async function getStoragePath(): Promise<string | null> {
  if (!isTauriRuntime()) return null;

  if (appDataDir) return appDataDir;

  try {
    const { appDataDir: getAppDataDir } = await import("@tauri-apps/api/path");
    const dir = await getAppDataDir();
    appDataDir = dir;
    return dir;
  } catch {
    return null;
  }
}

async function readStorageFile(): Promise<PersistedData> {
  const dir = await getStoragePath();
  if (!dir) return {};

  try {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const raw = await readTextFile(`${dir}${STORAGE_FILENAME}`);
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as PersistedData;
  } catch {
    // File doesn't exist yet or is corrupted — that's fine.
  }
  return {};
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
export async function restoreIfNeeded(): Promise<void> {
  if (!isTauriRuntime()) return;

  // Check if localStorage seems empty (main key missing)
  const hasRecentFiles = localStorage.getItem("xmlviewer-recent");
  if (hasRecentFiles) {
    // localStorage is intact — no restore needed, but let's sync
    // the file to make sure it's up-to-date.
    await persistToFile();
    return;
  }

  // localStorage is empty — try to restore from file
  const stored = await readStorageFile();
  if (Object.keys(stored).length === 0) return;

  for (const key of PERSISTED_KEYS) {
    const value = stored[key];
    if (value !== undefined && value !== null) {
      localStorage.setItem(key, value);
    }
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

  await writeStorageFile(data);
}
