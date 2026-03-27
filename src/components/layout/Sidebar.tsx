import { useEffect, useState } from "react";
import { Clock, File } from "lucide-react";
import { useDocumentStore } from "@/store/documentStore";

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
  const currentFilePath = useDocumentStore((s) => s.currentFilePath);

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
        <h1 className="text-lg font-bold">XML Viewer BR</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          NF-e / CT-e / NFS-e
        </p>
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
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 min-w-0"
                  title={recentFile.label}
                >
                  <span className="w-8 shrink-0 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                    {formatTimeSince(
                      recentFile.lastOpenedAt,
                      recentFile.id === currentFilePath ? Date.now() : now,
                    )}
                  </span>
                  <File size={14} className="shrink-0 text-gray-400 dark:text-gray-500" />
                  <span className="truncate">
                    {recentFile.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
