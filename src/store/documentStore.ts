import { create } from "zustand";
import type { ParsedDocument, ValidationResult } from "@/types/common";
import { parseXml } from "@/services/xmlParser";

interface DocumentState {
  currentDocument: ParsedDocument | null;
  currentXml: string | null;
  currentFilePath: string | null;
  validation: ValidationResult | null;
  recentFiles: string[];
  theme: "light" | "dark";
  loading: boolean;
  error: string | null;

  loadFile: (filePath: string, xmlContent?: string) => void;
  setDocument: (doc: ParsedDocument, xml: string, filePath: string) => void;
  setValidation: (v: ValidationResult) => void;
  clearDocument: () => void;
  toggleTheme: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const MAX_RECENT_FILES = 10;

function getInitialTheme(): "light" | "dark" {
  try {
    const saved = localStorage.getItem("xmlviewer-theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* ignore */
  }
  return "light";
}

function getRecentFiles(): string[] {
  try {
    const saved = localStorage.getItem("xmlviewer-recent");
    if (saved) return JSON.parse(saved);
  } catch {
    /* ignore */
  }
  return [];
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

  loadFile: (filePath: string, xmlContent?: string) => {
    set({ loading: true, error: null });

    try {
      if (xmlContent) {
        const doc = parseXml(xmlContent);
        const recent = [
          filePath,
          ...get().recentFiles.filter((f) => f !== filePath),
        ].slice(0, MAX_RECENT_FILES);
        localStorage.setItem("xmlviewer-recent", JSON.stringify(recent));

        set({
          currentDocument: doc,
          currentXml: xmlContent,
          currentFilePath: filePath,
          recentFiles: recent,
          loading: false,
          error: null,
          validation: null,
        });
      }
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Erro ao carregar arquivo",
      });
    }
  },

  setDocument: (doc, xml, filePath) => {
    const recent = [
      filePath,
      ...get().recentFiles.filter((f) => f !== filePath),
    ].slice(0, MAX_RECENT_FILES);
    localStorage.setItem("xmlviewer-recent", JSON.stringify(recent));
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
}));
