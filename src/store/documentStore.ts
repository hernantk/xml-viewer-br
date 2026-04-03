import { create } from "zustand";
import type {
  DocumentType,
  ParsedDocument,
  RecentFileEntry,
  ValidationResult,
} from "@/types/common";
import { parseXml } from "@/services/xmlParser";

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
  downloadDir: string;

  loadFile: (fileId: string, xmlContent?: string) => Promise<void>;
  setDocument: (doc: ParsedDocument, xml: string, filePath: string) => void;
  setValidation: (v: ValidationResult) => void;
  clearDocument: () => void;
  toggleTheme: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setMaxRecentFiles: (max: number) => void;
  setDownloadDir: (dir: string) => void;
  initializeDownloadDir: () => Promise<void>;
  removeRecentFile: (fileId: string) => void;
  loadMultipleFiles: (files: { id: string; content: string }[]) => Promise<{ loaded: number; skipped: number; limitIncreased: boolean; newLimit: number }>;
  loadPaths: (paths: string[]) => Promise<{ loaded: number; skipped: number; limitIncreased: boolean; newLimit: number }>;
}

const DEFAULT_MAX_RECENT_FILES = 300;
const MAX_RECENT_FILES_KEY = "xmlviewer-max-recent";
const DOWNLOAD_DIR_KEY = "xmlviewer-download-dir";
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

function getDownloadDir(): string {
  try {
    const saved = localStorage.getItem(DOWNLOAD_DIR_KEY);
    if (saved) return saved;
  } catch {
    /* ignore */
  }
  return "";
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

function extractDocumentMeta(doc: ParsedDocument): Pick<
  RecentFileEntry,
  "chave" | "numero" | "cnpjEmitente" | "nomeEmitente" | "cnpjDestinatario" | "nomeDestinatario"
> {
  if (doc.documentType === "nfe" && doc.nfe) {
    const { infNFe } = doc.nfe;
    return {
      chave: infNFe.id || undefined,
      numero: infNFe.ide.nNF || undefined,
      cnpjEmitente: infNFe.emit.CNPJ ?? infNFe.emit.CPF ?? undefined,
      nomeEmitente: infNFe.emit.xNome || undefined,
      cnpjDestinatario: infNFe.dest?.CNPJ ?? infNFe.dest?.CPF ?? undefined,
      nomeDestinatario: infNFe.dest?.xNome ?? undefined,
    };
  }
  if (doc.documentType === "cte" && doc.cte) {
    const { infCte } = doc.cte;
    return {
      chave: infCte.id || undefined,
      numero: infCte.ide.nCT || undefined,
      cnpjEmitente: infCte.emit.CNPJ || undefined,
      nomeEmitente: infCte.emit.xNome || undefined,
      cnpjDestinatario: infCte.dest?.CNPJ ?? infCte.dest?.CPF ?? undefined,
      nomeDestinatario: infCte.dest?.xNome ?? undefined,
    };
  }
  if (doc.documentType === "nfse" && doc.nfse) {
    const { infNfse } = doc.nfse.nfse;
    return {
      chave: infNfse.codigoVerificacao || undefined,
      numero: infNfse.numero || undefined,
      cnpjEmitente: infNfse.prestadorServico.identificacaoPrestador.cnpj || undefined,
      nomeEmitente: infNfse.prestadorServico.razaoSocial || undefined,
      cnpjDestinatario:
        infNfse.tomadorServico?.identificacaoTomador?.cnpj ??
        infNfse.tomadorServico?.identificacaoTomador?.cpf ??
        undefined,
      nomeDestinatario: infNfse.tomadorServico?.razaoSocial ?? undefined,
    };
  }
  return {};
}

function buildRecentFiles(
  fileId: string,
  recentFiles: RecentFileEntry[],
  documentType?: DocumentType,
  maxFiles: number = DEFAULT_MAX_RECENT_FILES,
  doc?: ParsedDocument,
): RecentFileEntry[] {
  const now = Date.now();
  const source: RecentFileEntry["source"] = canReopenRecentFile(fileId)
    ? "filesystem"
    : "memory";
  const label = getFileLabel(fileId);
  const meta = doc ? extractDocumentMeta(doc) : {};

  return [
    { id: fileId, label, source, lastOpenedAt: now, documentType, ...meta },
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
            documentType:
              entry.documentType === "nfe" ||
              entry.documentType === "cte" ||
              entry.documentType === "nfse"
                ? entry.documentType
                : undefined,
            chave: typeof entry.chave === "string" ? entry.chave : undefined,
            numero: typeof entry.numero === "string" ? entry.numero : undefined,
            cnpjEmitente: typeof entry.cnpjEmitente === "string" ? entry.cnpjEmitente : undefined,
            nomeEmitente: typeof entry.nomeEmitente === "string" ? entry.nomeEmitente : undefined,
            cnpjDestinatario: typeof entry.cnpjDestinatario === "string" ? entry.cnpjDestinatario : undefined,
            nomeDestinatario: typeof entry.nomeDestinatario === "string" ? entry.nomeDestinatario : undefined,
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

async function readFilesystemFile(path: string): Promise<string> {
  if (!isTauriRuntime()) {
    throw new Error("Abrir caminhos do sistema de arquivos so esta disponivel no app desktop.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("read_file", { path });
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
  downloadDir: getDownloadDir(),

  loadFile: async (fileId: string, xmlContent?: string) => {
    set({ loading: true, error: null });

    try {
      let content = xmlContent;
      if (content === undefined) {
        const cachedContent = getRecentFileCache()[fileId];
        if (cachedContent) {
          content = cachedContent;
        } else {
          if (!canReopenRecentFile(fileId)) {
            throw new Error(
              "Esse arquivo recente nao esta disponivel neste ambiente.",
            );
          }
          content = await readFilesystemFile(fileId);
        }
      }

      const doc = parseXml(content);
      const now = Date.now();
      const existingEntry = get().recentFiles.find((f) => f.id === fileId);
      const isRecentlyOpened =
        existingEntry != null && now - existingEntry.lastOpenedAt < 60_000;
      const recent = isRecentlyOpened
        ? get().recentFiles
        : buildRecentFiles(
            fileId,
            get().recentFiles,
            doc.documentType,
            get().maxRecentFiles,
            doc,
          );
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
    const recent = buildRecentFiles(
      filePath,
      get().recentFiles,
      doc.documentType,
      get().maxRecentFiles,
      doc,
    );
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

  setDownloadDir: (dir: string) => {
    localStorage.setItem(DOWNLOAD_DIR_KEY, dir);
    set({ downloadDir: dir });
  },

  initializeDownloadDir: async () => {
    const currentDownloadDir = get().downloadDir.trim();
    if (currentDownloadDir) {
      return;
    }

    if (!isTauriRuntime()) {
      return;
    }

    try {
      const { downloadDir } = await import("@tauri-apps/api/path");
      const resolvedDownloadDir = await downloadDir();
      if (resolvedDownloadDir && !get().downloadDir.trim()) {
        get().setDownloadDir(resolvedDownloadDir);
      }
    } catch {
      // Ignore failures: user can still configure it manually in Settings.
    }
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
    let firstErrorMessage: string | null = null;
    let lastDoc: ParsedDocument | null = null;
    let lastXml: string | null = null;
    let lastFilePath: string | null = null;
    let recentFiles = get().recentFiles;
    const xmlCache = { ...getRecentFileCache() };

    for (const file of files) {
      try {
        const doc = parseXml(file.content);
        recentFiles = buildRecentFiles(
          file.id,
          recentFiles,
          doc.documentType,
          currentMax,
          doc,
        );
        xmlCache[file.id] = file.content;
        lastDoc = doc;
        lastXml = file.content;
        lastFilePath = file.id;
        loaded++;
      } catch (error) {
        skipped++;
        if (!firstErrorMessage && error instanceof Error) {
          firstErrorMessage = error.message;
        }
      }
    }

    persistRecentFiles(recentFiles, xmlCache);

    set({
      currentDocument: lastDoc,
      currentXml: lastXml,
      currentFilePath: lastFilePath,
      recentFiles,
      loading: false,
      error:
        loaded === 0 && firstErrorMessage
          ? firstErrorMessage
          : skipped > 0
            ? `${skipped} arquivo(s) ignorado(s) por erro de leitura.`
            : null,
      validation: null,
    });

    return { loaded, skipped, limitIncreased, newLimit: currentMax };
  },

  loadPaths: async (paths) => {
    const uniqueXmlPaths = [...new Set(paths)]
      .filter((path) => path.toLowerCase().endsWith(".xml"));

    if (uniqueXmlPaths.length === 0) {
      return { loaded: 0, skipped: 0, limitIncreased: false, newLimit: get().maxRecentFiles };
    }

    const files: { id: string; content: string }[] = [];
    let skipped = 0;

    for (const path of uniqueXmlPaths) {
      try {
        const content = await readFilesystemFile(path);
        files.push({ id: path, content });
      } catch {
        skipped++;
      }
    }

    if (files.length === 0) {
      const message = skipped > 0
        ? `${skipped} arquivo(s) ignorado(s) por erro de leitura.`
        : "Nenhum arquivo XML valido foi encontrado.";
      set({ error: message });
      return { loaded: 0, skipped, limitIncreased: false, newLimit: get().maxRecentFiles };
    }

    const result = await get().loadMultipleFiles(files);
    return {
      loaded: result.loaded,
      skipped: result.skipped + skipped,
      limitIncreased: result.limitIncreased,
      newLimit: result.newLimit,
    };
  },
}));

export { createMemoryFileId };
