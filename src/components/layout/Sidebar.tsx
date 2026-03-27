import { useEffect, useState, useCallback, useRef } from "react";
import { Clock, File, FileDown, Printer, Trash2 } from "lucide-react";
import { useDocumentStore } from "@/store/documentStore";
import { usePdfExport } from "@/hooks/usePdfExport";
import appLogo from "@/assets/branding/app-logo.svg";

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

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
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

      <div className="flex-1 overflow-auto p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
          <Clock size={14} />
          Arquivos Recentes
        </div>

        {recentFiles.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
            Nenhum arquivo recente
          </p>
        ) : (
          <ul className="space-y-1">
            {recentFiles.map((recentFile) => (
              <li key={recentFile.id}>
                <button
                  onClick={() => loadFile(recentFile.id)}
                  onContextMenu={(e) => handleContextMenu(e, recentFile.id)}
                  className="w-full justify-between text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 min-w-0"
                  title={recentFile.label}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <File size={14} className="shrink-0 text-gray-400 dark:text-gray-500" />
                    <span className="truncate">
                      {recentFile.label}
                    </span>
                  </span>
                  <span className="w-8  shrink-0 text-[11px] font-medium text-gray-400 dark:text-gray-500 text-right">
                    {formatTimeSince(
                      recentFile.lastOpenedAt,
                      recentFile.id === currentFilePath ? Date.now() : now,
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
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
