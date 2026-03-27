import { useState, useRef, useEffect } from "react";
import { X, AlertTriangle, FolderOpen } from "lucide-react";
import { useDocumentStore } from "@/store/documentStore";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const maxRecentFiles = useDocumentStore((s) => s.maxRecentFiles);
  const recentFilesCount = useDocumentStore((s) => s.recentFiles.length);
  const setMaxRecentFiles = useDocumentStore((s) => s.setMaxRecentFiles);
  const downloadDir = useDocumentStore((s) => s.downloadDir);
  const setDownloadDir = useDocumentStore((s) => s.setDownloadDir);
  const [inputValue, setInputValue] = useState(String(maxRecentFiles));
  const [downloadDirValue, setDownloadDirValue] = useState(downloadDir);
  const [showWarning, setShowWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setInputValue(String(maxRecentFiles));
      setDownloadDirValue(downloadDir);
      setShowWarning(false);
      setTimeout(() => inputRef.current?.select(), 0);

      // Resolve system Downloads folder if not configured yet
      if (!downloadDir) {
        (async () => {
          try {
            const { downloadDir: getDownloadDir } = await import("@tauri-apps/api/path");
            const dir = await getDownloadDir();
            if (dir) setDownloadDirValue(dir);
          } catch {
            /* not in Tauri */
          }
        })();
      }
    }
  }, [open, maxRecentFiles, downloadDir]);

  if (!open) return null;

  const isValid = (() => {
    const num = Number(inputValue);
    return Number.isFinite(num) && num >= 1;
  })();

  const numValue = Number(inputValue);
  const willRemoveFiles = isValid && numValue < recentFilesCount;
  const filesToRemove = willRemoveFiles ? recentFilesCount - Math.floor(numValue) : 0;

  const handleSave = () => {
    if (!isValid) return;
    if (willRemoveFiles && !showWarning) {
      setShowWarning(true);
      return;
    }
    setMaxRecentFiles(numValue);
    setDownloadDir(downloadDirValue);
    onClose();
  };

  const handlePickFolder = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        setDownloadDirValue(selected as string);
      }
    } catch {
      // Not in Tauri — ignore
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowWarning(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-sm mx-4 border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold">Configurações</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label
              htmlFor="maxRecentFiles"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Máximo de arquivos recentes
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Quantidade máxima de arquivos mantidos no histórico. Padrão: 300.
            </p>
            <input
              ref={inputRef}
              id="maxRecentFiles"
              type="number"
              min={1}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {!isValid && inputValue !== "" && (
              <p className="text-xs text-red-500 mt-1">
                Informe um número maior ou igual a 1.
              </p>
            )}
            {showWarning && willRemoveFiles && (
              <div className="flex items-start gap-2 mt-2 p-2 rounded bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
                <AlertTriangle size={16} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Você possui <strong>{recentFilesCount}</strong> arquivos no histórico.
                  Essa alteração irá remover <strong>{filesToRemove}</strong> arquivo{filesToRemove > 1 ? "s" : ""} mais antigo{filesToRemove > 1 ? "s" : ""}.
                  Clique em <strong>Confirmar</strong> para prosseguir.
                </p>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="downloadDir"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Pasta padrão de downloads
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Caminho padrão para salvar arquivos XML e PDF exportados.
            </p>
            <div className="flex gap-2">
              <input
                id="downloadDir"
                type="text"
                value={downloadDirValue}
                onChange={(e) => setDownloadDirValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pasta de Downloads do sistema"
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
              />
              <button
                type="button"
                onClick={handlePickFolder}
                className="shrink-0 px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Escolher pasta"
              >
                <FolderOpen size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className={`px-3 py-1.5 text-sm rounded text-white disabled:opacity-50 disabled:cursor-not-allowed ${
              showWarning
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {showWarning ? "Confirmar" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
