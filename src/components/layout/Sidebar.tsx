import { useEffect, useState, useCallback, useRef } from "react";
import { Clock, FileDown, Printer, Search, Trash2 } from "lucide-react";
import { useDocumentStore } from "@/store/documentStore";
import { usePdfExport } from "@/hooks/usePdfExport";
import appLogo from "@/assets/branding/app-logo.svg";
import { getDocumentMeta } from "@/utils/documentMeta";
import type { DocumentType } from "@/types/common";
import { useVirtualizer } from "@tanstack/react-virtual";
import { isTauriRuntime } from "@/utils/runtime";

function formatTimeSince(lastOpenedAt: number, referenceNow = Date.now()): string {
  if (!lastOpenedAt) return "agora";

  const diffMs = referenceNow - lastOpenedAt;
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

export function Sidebar() {
  const [now, setNow] = useState(() => Date.now());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | DocumentType>("all");
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const recentFiles = useDocumentStore((s) => s.recentFiles);
  const loadFile = useDocumentStore((s) => s.loadFile);
  const removeRecentFile = useDocumentStore((s) => s.removeRecentFile);
  const currentFilePath = useDocumentStore((s) => s.currentFilePath);
  const { exportPdf, exporting, printPdf, printing } = usePdfExport();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    fileId: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, fileId: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, fileId });
    },
    [],
  );

  const closeMenu = useCallback(() => setContextMenu(null), []);

  const handlePrintPdf = useCallback(async () => {
    if (!contextMenu) return;
    const fileId = contextMenu.fileId;
    closeMenu();
    // Load the file first so it renders, then export
    await loadFile(fileId);
    // Small delay for the viewer to render
    requestAnimationFrame(() => {
      setTimeout(() => {
        exportPdf();
      }, 300);
    });
  }, [contextMenu, closeMenu, loadFile, exportPdf]);

  const handlePrint = useCallback(async () => {
    if (!contextMenu) return;
    const fileId = contextMenu.fileId;
    closeMenu();
    await loadFile(fileId);
    requestAnimationFrame(() => {
      setTimeout(() => {
        printPdf();
      }, 300);
    });
  }, [contextMenu, closeMenu, loadFile, printPdf]);

  const handleDelete = useCallback(() => {
    if (!contextMenu) return;
    removeRecentFile(contextMenu.fileId);
    closeMenu();
  }, [contextMenu, removeRecentFile, closeMenu]);

  // Close context menu on click outside or Escape
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu, closeMenu]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) {
      setAppVersion("1.0.0");
      return;
    }
    import("@tauri-apps/api/app")
      .then(({ getVersion }) => getVersion())
      .then(setAppVersion)
      .catch(() => setAppVersion("1.0.0"));
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredRecentFiles = recentFiles.filter((recentFile) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      recentFile.label.toLowerCase().includes(normalizedSearch);
    const matchesType =
      typeFilter === "all" || recentFile.documentType === typeFilter;

    return matchesSearch && matchesType;
  });

  const listParentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filteredRecentFiles.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  return (
    <aside className="flex w-60 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 no-print">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <img
            src={appLogo}
            alt="Logo do XML Viewer BR"
            className="h-11 w-11 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight">XML Viewer BR</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              NF-e / CT-e / NFS-e
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 pt-2">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400">
          <Clock size={14} />
          Arquivos Recentes
        </div>

        {recentFiles.length > 0 && (
          <div className="mb-2 rounded-lg ">
            <div className="flex items-center gap-1">
              <label className="relative min-w-0 flex-1">
                <Search
                  size={12}
                  className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar"
                  className="h-7 w-full rounded-md bg-white/90 py-1 pl-7 pr-2 text-[11px] text-gray-700 outline-none ring-0 transition placeholder:text-gray-400 focus:bg-white dark:bg-gray-900/80 dark:text-gray-200 dark:focus:bg-gray-900"
                />
              </label>
              <div className="relative shrink-0">
                <select
                  value={typeFilter}
                  onChange={(e) =>
                    setTypeFilter(e.target.value as "all" | DocumentType)
                  }
                  className="h-7 appearance-none rounded-md bg-white/90 pl-2 pr-6 text-[11px] font-medium text-gray-600 outline-none transition focus:bg-white dark:bg-gray-900/80 dark:text-gray-300 dark:focus:bg-gray-900"
                >
                  <option value="all">Todos</option>
                  <option value="nfe">NF-e</option>
                  <option value="cte">CT-e</option>
                  <option value="nfse">NFS-e</option>
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 dark:text-gray-500">
                  ▾
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div ref={listParentRef} className="flex-1 overflow-auto px-3 pb-2">
        {recentFiles.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
            Nenhum arquivo recente
          </p>
        ) : filteredRecentFiles.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
            Nenhum arquivo encontrado para esse filtro
          </p>
        ) : (
          <div
            style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const recentFile = filteredRecentFiles[virtualItem.index];
              const meta = recentFile.documentType
                ? getDocumentMeta(recentFile.documentType)
                : null;
              const ItemIcon = meta?.icon;

              return (
                <div
                  key={recentFile.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <button
                    onClick={() => loadFile(recentFile.id)}
                    onContextMenu={(e) => handleContextMenu(e, recentFile.id)}
                    className={`w-full rounded-md px-2 py-1.5 text-left transition hover:bg-gray-100 dark:hover:bg-gray-800 ${
                      recentFile.id === currentFilePath
                        ? "bg-gray-200 dark:bg-gray-700"
                        : ""
                    }`}
                    title={recentFile.label}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-400">
                          {ItemIcon ? (
                            <ItemIcon size={13} className="shrink-0" />
                          ) : (
                            <Search size={13} className="shrink-0" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                            {recentFile.label}
                          </span>
                        </span>
                      </span>
                      <span className="w-7 shrink-0 text-right text-[10px] font-medium text-gray-400 dark:text-gray-500">
                        {formatTimeSince(
                          recentFile.lastOpenedAt,
                          recentFile.id === currentFilePath ? Date.now() : now,
                        )}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 shrink-0">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center select-none">
          {appVersion ? `v${appVersion}` : ""}
        </p>
      </div>

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={handlePrintPdf}
            disabled={exporting}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <FileDown size={14} />
            {exporting ? "Exportando..." : "Exportar PDF"}
          </button>
          <button
            onClick={handlePrint}
            disabled={printing}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <Printer size={14} />
            {printing ? "Imprimindo..." : "Imprimir"}
          </button>
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Trash2 size={14} />
            Remover do histórico
          </button>
        </div>
      )}
    </aside>
  );
}
