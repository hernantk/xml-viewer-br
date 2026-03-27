import { Clock, File } from "lucide-react";
import { useDocumentStore } from "@/store/documentStore";

export function Sidebar() {
  const recentFiles = useDocumentStore((s) => s.recentFiles);
  const loadFile = useDocumentStore((s) => s.loadFile);

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
            {recentFiles.map((filePath) => (
              <li key={filePath}>
                <button
                  onClick={() => loadFile(filePath)}
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 truncate"
                  title={filePath}
                >
                  <File size={14} className="shrink-0" />
                  <span className="truncate">
                    {filePath.split(/[/\\]/).pop()}
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
