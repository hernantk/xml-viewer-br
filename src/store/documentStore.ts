import { create } from "zustand";
import type { ParsedDocument, ValidationResult } from "@/types/common";
import { parseXml } from "@/services/xmlParser";

export interface RecentFileEntry {
  id: string;
  label: string;
  source: "filesystem" | "memory";
  lastOpenedAt: number;
}

interface DocumentState {
  currentDocument: ParsedDocument | null;
  currentXml: string | null;
  currentFilePath: string | null;
  validation: ValidationResult | null;
  recentFiles: RecentFileEntry[];
  theme: "light" | "dark";
  loading: boolean;
  error: string | null;
  maxRecentFiles: number;

  loadFile: (fileId: string, xmlContent?: string) => Promise<void>;
  setDocument: (doc: ParsedDocument, xml: string, filePath: string) => void;
  setValidation: (v: ValidationResult) => void;
  clearDocument: () => void;
  toggleTheme: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setMaxRecentFiles: (max: number) => void;
  removeRecentFile: (fileId: string) => void;
  loadMultipleFiles: (files: { id: string; content: string }[]) => Promise<{ loaded: number; skipped: number; limitIncreased: boolean; newLimit: number }>;
}

const DEFAULT_MAX_RECENT_FILES = 300;
const MAX_RECENT_FILES_KEY = "xmlviewer-max-recent";
const RECENT_FILES_KEY = "xmlviewer-recent";
const RECENT_CACHE_KEY = "xmlviewer-recent-cache";

function getMaxRecentFiles(): number {
  try {
    const saved = localStorage.getItem(MAX_RECENT_FILES_KEY);
    if (saved) {
      const num = Number(saved);
      if (Number.isFinite(num) && num >= 1) return Math.floor(num);
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_MAX_RECENT_FILES;
}

function isTauriRuntime(): boolean {
  const tauriWindow = window as Window & {
    __TAURI_INTERNALS__?: { invoke?: unknown };
  };

  return (
    typeof window !== "undefined" &&
    typeof tauriWindow.__TAURI_INTERNALS__ === "object" &&
    typeof tauriWindow.__TAURI_INTERNALS__.invoke === "function"
  );
}

function canReopenRecentFile(filePath: string): boolean {
  return /[\\/]/.test(filePath);
}

function createMemoryFileId(fileName: string): string {
  return `memory:${fileName}:${Date.now()}`;
}

function getFileLabel(fileId: string): string {
  if (canReopenRecentFile(fileId)) {
    return fileId.split(/[/\\]/).pop() ?? fileId;
  }

  const [, fileName] = fileId.split(":");
  return fileName || fileId;
}

function buildRecentFiles(
  fileId: string,
  recentFiles: RecentFileEntry[],
  maxFiles: number = DEFAULT_MAX_RECENT_FILES,
): RecentFileEntry[] {
  const now = Date.now();
  const source: RecentFileEntry["source"] = canReopenRecentFile(fileId)
    ? "filesystem"
    : "memory";
  const label = getFileLabel(fileId);

  return [
    { id: fileId, label, source, lastOpenedAt: now },
    ...recentFiles.filter((entry) => entry.id !== fileId),
  ].slice(0, maxFiles);
}

function getInitialTheme(): "light" | "dark" {
  try {
    const saved = localStorage.getItem("xmlviewer-theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* ignore */
  }
  return "light";
}

function getRecentFiles(): RecentFileEntry[] {
  try {
    const saved = localStorage.getItem(RECENT_FILES_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry): RecentFileEntry | null => {
        if (typeof entry === "string") {
          return canReopenRecentFile(entry)
            ? {
                id: entry,
                label: getFileLabel(entry),
                source: "filesystem",
                lastOpenedAt: 0,
              }
            : null;
        }

        if (
          entry &&
          typeof entry === "object" &&
          typeof entry.id === "string"
        ) {
          return {
            id: entry.id,
            label:
              typeof entry.label === "string"
                ? entry.label
                : getFileLabel(entry.id),
            source:
              entry.source === "memory" ? "memory" : "filesystem",
            lastOpenedAt:
              typeof entry.lastOpenedAt === "number" ? entry.lastOpenedAt : 0,
          };
        }

        if (
          entry &&
          typeof entry === "object" &&
          typeof entry.path === "string" &&
          canReopenRecentFile(entry.path)
        ) {
          return {
            id: entry.path,
            label: getFileLabel(entry.path),
            source: "filesystem",
            lastOpenedAt:
              typeof entry.lastOpenedAt === "number" ? entry.lastOpenedAt : 0,
          };
        }

        return null;
      })
      .filter((entry): entry is RecentFileEntry => entry !== null);
  } catch {
    /* ignore */
  }
  return [];
}

function getRecentFileCache(): Record<string, string> {
  try {
    const saved = localStorage.getItem(RECENT_CACHE_KEY);
    if (!saved) return {};

    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, string>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function persistRecentFiles(
  recentFiles: RecentFileEntry[],
  xmlCache: Record<string, string>,
) {
  localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recentFiles));

  const trimmedCache = Object.fromEntries(
    recentFiles
      .filter((entry) => typeof xmlCache[entry.id] === "string")
      .map((entry) => [entry.id, xmlCache[entry.id]]),
  );
  localStorage.setItem(RECENT_CACHE_KEY, JSON.stringify(trimmedCache));
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  currentDocument: null,
  currentXml: null,
  currentFilePath: null,
  validation: null,
  recentFiles: getRecentFiles(),
  theme: getInitialTheme(),
  loading: false,
  error: null,
  maxRecentFiles: getMaxRecentFiles(),

  loadFile: async (fileId: string, xmlContent?: string) => {
    set({ loading: true, error: null });

    try {
      let content = xmlContent;
      if (!content) {
        const cachedContent = getRecentFileCache()[fileId];
        if (cachedContent) {
          content = cachedContent;
        } else {
          if (!isTauriRuntime()) {
            throw new Error(
              "Esse arquivo recente nao esta disponivel neste ambiente.",
            );
          }

          const { readTextFile } = await import("@tauri-apps/plugin-fs");
          content = await readTextFile(fileId);
        }
      }

      const doc = parseXml(content);
      const recent = buildRecentFiles(fileId, get().recentFiles, get().maxRecentFiles);
      const xmlCache = {
        ...getRecentFileCache(),
        [fileId]: content,
      };
      persistRecentFiles(recent, xmlCache);

      set({
        currentDocument: doc,
        currentXml: content,
        currentFilePath: fileId,
        recentFiles: recent,
        loading: false,
        error: null,
        validation: null,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Erro ao carregar arquivo",
      });
    }
  },

  setDocument: (doc, xml, filePath) => {
    const recent = buildRecentFiles(filePath, get().recentFiles, get().maxRecentFiles);
    const xmlCache = {
      ...getRecentFileCache(),
      [filePath]: xml,
    };
    persistRecentFiles(recent, xmlCache);
    set({
      currentDocument: doc,
      currentXml: xml,
      currentFilePath: filePath,
      recentFiles: recent,
      error: null,
    });
  },

  setValidation: (v) => set({ validation: v }),

  clearDocument: () =>
    set({
      currentDocument: null,
      currentXml: null,
      currentFilePath: null,
      validation: null,
      error: null,
    }),

  toggleTheme: () => {
    const newTheme = get().theme === "light" ? "dark" : "light";
    localStorage.setItem("xmlviewer-theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    set({ theme: newTheme });
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  setMaxRecentFiles: (max: number) => {
    const clamped = Math.max(1, Math.floor(max));
    localStorage.setItem(MAX_RECENT_FILES_KEY, String(clamped));
    const current = get().recentFiles;
    const trimmed = current.slice(0, clamped);
    const xmlCache = getRecentFileCache();
    persistRecentFiles(trimmed, xmlCache);
    set({ maxRecentFiles: clamped, recentFiles: trimmed });
  },

  removeRecentFile: (fileId: string) => {
    const updated = get().recentFiles.filter((entry) => entry.id !== fileId);
    const xmlCache = getRecentFileCache();
    delete xmlCache[fileId];
    persistRecentFiles(updated, xmlCache);
    if (get().currentFilePath === fileId) {
      set({
        recentFiles: updated,
        currentDocument: null,
        currentXml: null,
        currentFilePath: null,
        validation: null,
      });
    } else {
      set({ recentFiles: updated });
    }
  },

  loadMultipleFiles: async (files) => {
    if (files.length === 0) return { loaded: 0, skipped: 0, limitIncreased: false, newLimit: get().maxRecentFiles };

    set({ loading: true, error: null });

    let limitIncreased = false;
    let currentMax = get().maxRecentFiles;
    const currentCount = get().recentFiles.length;
    const uniqueNewIds = new Set(files.map((f) => f.id));
    const existingIds = new Set(get().recentFiles.map((r) => r.id));
    const trulyNewCount = [...uniqueNewIds].filter((id) => !existingIds.has(id)).length;
    const totalAfterImport = currentCount + trulyNewCount;

    if (totalAfterImport > currentMax) {
      const newLimit = totalAfterImport + 500;
      localStorage.setItem(MAX_RECENT_FILES_KEY, String(newLimit));
      currentMax = newLimit;
      limitIncreased = true;
      set({ maxRecentFiles: newLimit });
    }

    let loaded = 0;
    let skipped = 0;
    let lastDoc: ParsedDocument | null = null;
    let lastXml: string | null = null;
    let lastFilePath: string | null = null;
    let recentFiles = get().recentFiles;
    const xmlCache = { ...getRecentFileCache() };

    for (const file of files) {
      try {
        const doc = parseXml(file.content);
        recentFiles = buildRecentFiles(file.id, recentFiles, currentMax);
        xmlCache[file.id] = file.content;
        lastDoc = doc;
        lastXml = file.content;
        lastFilePath = file.id;
        loaded++;
      } catch {
        skipped++;
      }
    }

    persistRecentFiles(recentFiles, xmlCache);

    set({
      currentDocument: lastDoc,
      currentXml: lastXml,
      currentFilePath: lastFilePath,
      recentFiles,
      loading: false,
      error: skipped > 0 ? `${skipped} arquivo(s) ignorado(s) por erro de leitura.` : null,
      validation: null,
    });

    return { loaded, skipped, limitIncreased, newLimit: currentMax };
  },
}));

export { createMemoryFileId };
