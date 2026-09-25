import { create } from "zustand";
import type {
  DocumentType,
  ParsedDocument,
  RecentFileContent,
  RecentFileEntry,
  ValidationResult,
} from "@/types/common";
import { parseXml } from "@/services/xmlParser";
import { persistToFile } from "@/utils/persistentStorage";
import { isTauriRuntime } from "@/utils/runtime";

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
  isEdited: boolean;
  groupByEmitente: boolean;
  showIbsCbs: boolean;

  loadFile: (fileId: string, xmlContent?: string) => Promise<void>;
  setDocument: (
    doc: ParsedDocument,
    xml: string,
    filePath: string,
    edited?: boolean,
  ) => void;
  setValidation: (v: ValidationResult) => void;
  clearDocument: () => void;
  toggleTheme: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setMaxRecentFiles: (max: number) => void;
  setDownloadDir: (dir: string) => void;
  setGroupByEmitente: (enabled: boolean) => void;
  setShowIbsCbs: (enabled: boolean) => void;
  initializeDownloadDir: () => Promise<void>;
  clearRecentFiles: () => void;
  removeRecentFile: (fileId: string) => void;
  togglePin: (fileId: string) => void;
  getRecentFileContent: (fileId: string) => Promise<RecentFileContent>;
  loadMultipleFiles: (files: { id: string; content: string }[]) => Promise<{ loaded: number; skipped: number; limitIncreased: boolean; newLimit: number }>;
  loadPaths: (paths: string[]) => Promise<{ loaded: number; skipped: number; limitIncreased: boolean; newLimit: number }>;
  setEdited: (edited: boolean) => void;
}

const DEFAULT_MAX_RECENT_FILES = 300;
const MAX_RECENT_FILES_KEY = "xmlviewer-max-recent";
const DOWNLOAD_DIR_KEY = "xmlviewer-download-dir";
const RECENT_FILES_KEY = "xmlviewer-recent";
const RECENT_CACHE_KEY = "xmlviewer-recent-cache";
const GROUP_BY_EMITENTE_KEY = "xmlviewer-group-by-emitente";
const SHOW_IBS_CBS_KEY = "xmlviewer-show-ibs-cbs";

function getGroupByEmitente(): boolean {
  try {
    const saved = localStorage.getItem(GROUP_BY_EMITENTE_KEY);
    if (saved === null) return true;
    if (saved === "0" || saved === "false") return false;
    return true;
  } catch {
    /* ignore */
  }
  return true;
}

function getShowIbsCbs(): boolean {
  try {
    const saved = localStorage.getItem(SHOW_IBS_CBS_KEY);
    if (saved === null) return false;
    if (saved === "0" || saved === "false") return false;
    return true;
  } catch {
    /* ignore */
  }
  return false;
}

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

function canReopenRecentFile(filePath: string): boolean {
  return /[\\/]/.test(filePath);
}

let memoryFileSequence = 0;

function createMemoryFileId(fileName: string): string {
  memoryFileSequence += 1;
  return `memory:${fileName}:${Date.now()}:${memoryFileSequence}`;
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
  if (doc.documentType === "nfse-sped" && doc.spedNfse) {
    const { infNFSe } = doc.spedNfse;
    const dps = infNFSe.dps?.infDPS;
    return {
      chave: infNFSe.id || undefined,
      numero: infNFSe.nNFSe || undefined,
      cnpjEmitente: infNFSe.emit.CNPJ || undefined,
      nomeEmitente: infNFSe.emit.xNome || undefined,
      cnpjDestinatario: dps?.toma.CNPJ ?? dps?.toma.CPF ?? undefined,
      nomeDestinatario: dps?.toma.xNome ?? undefined,
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
  editedOverride?: boolean,
): RecentFileEntry[] {
  const now = Date.now();
  const label = getFileLabel(fileId);
  const meta = doc ? extractDocumentMeta(doc) : {};
  const existing = recentFiles.find((entry) => entry.id === fileId);
  const source: RecentFileEntry["source"] =
    existing?.source ?? (canReopenRecentFile(fileId) ? "filesystem" : "memory");
  const edited =
    editedOverride === undefined
      ? existing?.edited === true || undefined
      : editedOverride || undefined;
  const pinned = existing?.pinned === true || undefined;

  const newEntry: RecentFileEntry = {
    id: fileId,
    label,
    source,
    lastOpenedAt: now,
    documentType,
    edited,
    ...meta,
    pinned,
  };

  let result = [newEntry, ...recentFiles.filter((entry) => entry.id !== fileId)];

  result.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.lastOpenedAt - a.lastOpenedAt;
  });

  return result.slice(0, maxFiles);
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
              entry.source === "memory" || !canReopenRecentFile(entry.id)
                ? "memory"
                : "filesystem",
            lastOpenedAt:
              typeof entry.lastOpenedAt === "number" ? entry.lastOpenedAt : 0,
            documentType:
              entry.documentType === "nfe" ||
              entry.documentType === "cte" ||
              entry.documentType === "nfse" ||
              entry.documentType === "nfse-sped" ||
              entry.documentType === "xml"
                ? entry.documentType
                : undefined,
            edited: entry.edited === true || undefined,
            pinned: entry.pinned === true || undefined,
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

function trimRecentFileCache(
  recentFiles: RecentFileEntry[],
  xmlCache: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    recentFiles
      .filter(
        (entry) =>
          (entry.source === "memory" || entry.edited === true) &&
          typeof xmlCache[entry.id] === "string",
      )
      .map((entry) => [entry.id, xmlCache[entry.id]]),
  );
}

function persistRecentFiles(
  recentFiles: RecentFileEntry[],
  xmlCache: Record<string, string>,
) {
  const trimmedCache = trimRecentFileCache(recentFiles, xmlCache);
  const previousCache = localStorage.getItem(RECENT_CACHE_KEY);
  // Cache first: if quota is exceeded, metadata never points to missing content.
  localStorage.setItem(RECENT_CACHE_KEY, JSON.stringify(trimmedCache));
  try {
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recentFiles));
  } catch (error) {
    try {
      if (previousCache === null) {
        localStorage.removeItem(RECENT_CACHE_KEY);
      } else {
        localStorage.setItem(RECENT_CACHE_KEY, previousCache);
      }
    } catch {
      // Preserve the original metadata write error if rollback also fails.
    }
    throw error;
  }

  // Mirror to filesystem so data survives app updates
  void persistToFile();
}

async function readFilesystemFile(path: string): Promise<string> {
  if (!isTauriRuntime()) {
    throw new Error("Abrir caminhos do sistema de arquivos só está disponível no app desktop.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  try {
    return await invoke<string>("read_file", { path });
  } catch {
    try {
      const cached = await invoke<string | null>("read_cached_document", {
        fileId: path,
      });
      if (typeof cached === "string") return cached;
    } catch {
      /* surface the user-facing message below */
    }

    throw new Error(
      "O arquivo original foi removido ou movido e não há uma cópia interna disponível.",
    );
  }
}

async function cacheFilesystemDocument(
  fileId: string,
  content: string,
): Promise<void> {
  if (!isTauriRuntime() || !canReopenRecentFile(fileId)) return;

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("cache_document", { fileId, content });
  } catch {
    // The original file remains usable even if the internal copy fails.
  }
}

async function removeCachedDocument(fileId: string): Promise<void> {
  if (!isTauriRuntime() || !canReopenRecentFile(fileId)) return;

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("remove_cached_document", { fileId });
  } catch {
    /* best-effort cache cleanup */
  }
}

async function clearDocumentCache(): Promise<void> {
  if (!isTauriRuntime()) return;

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("clear_document_cache");
  } catch {
    /* best-effort cache cleanup */
  }
}

async function resolveRecentFileContent(
  fileId: string,
  recentFiles: RecentFileEntry[],
): Promise<RecentFileContent> {
  const entry = recentFiles.find((recentFile) => recentFile.id === fileId);
  const source =
    entry?.source ?? (canReopenRecentFile(fileId) ? "filesystem" : "memory");
  const cachedContent = getRecentFileCache()[fileId];

  if (source === "memory" || entry?.edited === true) {
    if (typeof cachedContent === "string") {
      return {
        content: cachedContent,
        edited: entry?.edited === true,
      };
    }

    if (source === "memory") {
      throw new Error("Esse arquivo recente não está mais disponível no cache local.");
    }
  }

  if (!canReopenRecentFile(fileId)) {
    throw new Error("Esse arquivo recente não está disponível neste ambiente.");
  }

  return {
    content: await readFilesystemFile(fileId),
    edited: false,
  };
}

const initialRecentFiles = getRecentFiles();
const initialCache = getRecentFileCache();
const trimmedInitialCache = trimRecentFileCache(initialRecentFiles, initialCache);
if (JSON.stringify(trimmedInitialCache) !== JSON.stringify(initialCache)) {
  localStorage.setItem(RECENT_CACHE_KEY, JSON.stringify(trimmedInitialCache));
  void persistToFile();
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  currentDocument: null,
  currentXml: null,
  currentFilePath: null,
  validation: null,
  recentFiles: initialRecentFiles,
  theme: getInitialTheme(),
  loading: false,
  error: null,
  maxRecentFiles: getMaxRecentFiles(),
  downloadDir: getDownloadDir(),
  isEdited: false,
  groupByEmitente: getGroupByEmitente(),
  showIbsCbs: getShowIbsCbs(),

  loadFile: async (fileId: string, xmlContent?: string) => {
    set({ loading: true, error: null });
    await new Promise((r) => setTimeout(r, 0));

    try {
      let content = xmlContent;
      let edited = false;
      if (content === undefined) {
        const resolved = await resolveRecentFileContent(fileId, get().recentFiles);
        content = resolved.content;
        edited = resolved.edited;
      }

      const doc = parseXml(content);
      await cacheFilesystemDocument(fileId, content);
      const recent = buildRecentFiles(
        fileId,
        get().recentFiles,
        doc.documentType,
        get().maxRecentFiles,
        doc,
        edited,
      );
      const recentEntry = recent.find((entry) => entry.id === fileId);
      const xmlCache = { ...getRecentFileCache() };
      if (recentEntry?.source === "memory" || edited) {
        xmlCache[fileId] = content;
      } else {
        delete xmlCache[fileId];
      }
      persistRecentFiles(recent, xmlCache);

      set({
        currentDocument: doc,
        currentXml: content,
        currentFilePath: fileId,
        recentFiles: recent,
        loading: false,
        error: null,
        validation: null,
        isEdited: edited,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Erro ao carregar arquivo",
      });
    }
  },

  setDocument: (doc, xml, filePath, edited = false) => {
    void cacheFilesystemDocument(filePath, xml);
    const recent = buildRecentFiles(
      filePath,
      get().recentFiles,
      doc.documentType,
      get().maxRecentFiles,
      doc,
      edited,
    );
    const recentEntry = recent.find((entry) => entry.id === filePath);
    const xmlCache = { ...getRecentFileCache() };
    if (recentEntry?.source === "memory" || edited) {
      xmlCache[filePath] = xml;
    } else {
      delete xmlCache[filePath];
    }
    persistRecentFiles(recent, xmlCache);
    set({
      currentDocument: doc,
      currentXml: xml,
      currentFilePath: filePath,
      recentFiles: recent,
      error: null,
      validation: null,
      isEdited: edited,
    });
  },

  setEdited: (edited) => {
    const filePath = get().currentFilePath;
    if (filePath) {
      const updated = get().recentFiles.map((entry) =>
        entry.id === filePath ? { ...entry, edited: edited || undefined } : entry,
      );
      const xmlCache = getRecentFileCache();
      const currentEntry = updated.find((entry) => entry.id === filePath);
      const currentXml = get().currentXml;
      if (edited && currentXml) {
        xmlCache[filePath] = currentXml;
      } else if (currentEntry?.source !== "memory") {
        delete xmlCache[filePath];
      }
      persistRecentFiles(updated, xmlCache);
      set({ isEdited: edited, recentFiles: updated });
    } else {
      set({ isEdited: edited });
    }
  },

  setValidation: (v) => set({ validation: v }),

  clearDocument: () =>
    set({
      currentDocument: null,
      currentXml: null,
      currentFilePath: null,
      validation: null,
      error: null,
      isEdited: false,
    }),

  toggleTheme: () => {
    const newTheme = get().theme === "light" ? "dark" : "light";
    localStorage.setItem("xmlviewer-theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    set({ theme: newTheme });
    void persistToFile();
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  setMaxRecentFiles: (max: number) => {
    const clamped = Math.max(1, Math.floor(max));
    localStorage.setItem(MAX_RECENT_FILES_KEY, String(clamped));
    const current = get().recentFiles;
    const trimmed = current.slice(0, clamped);
    const retainedIds = new Set(trimmed.map((entry) => entry.id));
    for (const entry of current) {
      if (!retainedIds.has(entry.id)) void removeCachedDocument(entry.id);
    }
    const xmlCache = getRecentFileCache();
    persistRecentFiles(trimmed, xmlCache); // already calls persistToFile()
    set({ maxRecentFiles: clamped, recentFiles: trimmed });
  },

  setDownloadDir: (dir: string) => {
    localStorage.setItem(DOWNLOAD_DIR_KEY, dir);
    set({ downloadDir: dir });
    void persistToFile();
  },

  setGroupByEmitente: (enabled: boolean) => {
    try {
      localStorage.setItem(GROUP_BY_EMITENTE_KEY, enabled ? "1" : "0");
    } catch {
      /* ignore */
    }
    set({ groupByEmitente: enabled });
    void persistToFile();
  },

  setShowIbsCbs: (enabled: boolean) => {
    try {
      localStorage.setItem(SHOW_IBS_CBS_KEY, enabled ? "1" : "0");
    } catch {
      /* ignore */
    }
    set({ showIbsCbs: enabled });
    void persistToFile();
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

  clearRecentFiles: () => {
    persistRecentFiles([], {});
    void clearDocumentCache();
    set({ recentFiles: [] });
  },

  removeRecentFile: (fileId: string) => {
    const updated = get().recentFiles.filter((entry) => entry.id !== fileId);
    const xmlCache = getRecentFileCache();
    delete xmlCache[fileId];
    persistRecentFiles(updated, xmlCache);
    void removeCachedDocument(fileId);
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

  togglePin: (fileId: string) => {
    const updated = get().recentFiles.map((entry) =>
      entry.id === fileId
        ? { ...entry, pinned: entry.pinned ? undefined : true }
        : entry,
    );
    updated.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.lastOpenedAt - a.lastOpenedAt;
    });
    const xmlCache = getRecentFileCache();
    persistRecentFiles(updated, xmlCache);
    set({ recentFiles: updated });
  },

  getRecentFileContent: async (fileId: string) => {
    return resolveRecentFileContent(fileId, get().recentFiles);
  },

  loadMultipleFiles: async (files) => {
    if (files.length === 0) return { loaded: 0, skipped: 0, limitIncreased: false, newLimit: get().maxRecentFiles };

    set({ loading: true, error: null });
    await new Promise((r) => setTimeout(r, 0));

    let loaded = 0;
    let skipped = 0;
    let firstErrorMessage: string | null = null;
    let lastDoc: ParsedDocument | null = null;
    let lastXml: string | null = null;
    let lastFilePath: string | null = null;
    let recentFiles = get().recentFiles;
    const xmlCache = { ...getRecentFileCache() };
    const parsedFiles: { id: string; content: string; doc: ParsedDocument }[] = [];

    for (const file of files) {
      try {
        const doc = parseXml(file.content);
        parsedFiles.push({ ...file, doc });
      } catch (error) {
        skipped++;
        if (!firstErrorMessage && error instanceof Error) {
          firstErrorMessage = error.message;
        }
      }
    }

    let limitIncreased = false;
    let currentMax = get().maxRecentFiles;
    const existingIds = new Set(recentFiles.map((entry) => entry.id));
    const uniqueValidIds = new Set(parsedFiles.map((file) => file.id));
    const trulyNewCount = [...uniqueValidIds].filter(
      (id) => !existingIds.has(id),
    ).length;
    const totalAfterImport = recentFiles.length + trulyNewCount;

    if (totalAfterImport > currentMax) {
      const newLimit = totalAfterImport + 500;
      localStorage.setItem(MAX_RECENT_FILES_KEY, String(newLimit));
      currentMax = newLimit;
      limitIncreased = true;
      set({ maxRecentFiles: newLimit });
      // persistToFile() will be called by persistRecentFiles() below
    }

    for (const file of parsedFiles) {
      try {
        const { doc } = file;
        recentFiles = buildRecentFiles(
          file.id,
          recentFiles,
          doc.documentType,
          currentMax,
          doc,
          false,
        );
        const recentEntry = recentFiles.find((entry) => entry.id === file.id);
        if (recentEntry?.source === "memory") {
          xmlCache[file.id] = file.content;
        } else {
          delete xmlCache[file.id];
          await cacheFilesystemDocument(file.id, file.content);
        }
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

    const error =
      loaded === 0 && firstErrorMessage
        ? firstErrorMessage
        : skipped > 0
          ? `${skipped} arquivo(s) ignorado(s) por erro de leitura.`
          : null;

    if (loaded > 0) {
      set({
        currentDocument: lastDoc,
        currentXml: lastXml,
        currentFilePath: lastFilePath,
        recentFiles,
        loading: false,
        error,
        validation: null,
        isEdited: false,
      });
    } else {
      set({ recentFiles, loading: false, error });
    }

    return { loaded, skipped, limitIncreased, newLimit: currentMax };
  },

  loadPaths: async (paths) => {
    set({ loading: true, error: null });

    const uniqueXmlPaths = [...new Set(paths)]
      .filter((path) => path.toLowerCase().endsWith(".xml"));

    if (uniqueXmlPaths.length === 0) {
      set({ loading: false, error: "Nenhum arquivo XML válido foi encontrado." });
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
        : "Nenhum arquivo XML válido foi encontrado.";
      set({ loading: false, error: message });
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
