import {
  AlertCircle,
  ArrowUpCircle,
  CheckCircle2,
  Download,
  RefreshCw,
  X,
} from "lucide-react";
import type { UpdateInfo, UpdaterStatus } from "@/hooks/useUpdater";

interface UpdaterModalProps {
  status: UpdaterStatus;
  updateInfo: UpdateInfo | null;
  downloadProgress: number;
  errorMessage: string | null;
  onDownload: () => void;
  onRelaunch: () => void;
  onDismiss: () => void;
}

const VISIBLE_STATUSES: UpdaterStatus[] = [
  "available",
  "downloading",
  "ready",
  "error",
];

export function UpdaterModal({
  status,
  updateInfo,
  downloadProgress,
  errorMessage,
  onDownload,
  onRelaunch,
  onDismiss,
}: UpdaterModalProps) {
  if (!VISIBLE_STATUSES.includes(status)) return null;

  const isDownloading = status === "downloading";

  const formattedDate =
    updateInfo?.date
      ? (() => {
          try {
            return new Date(updateInfo.date).toLocaleDateString("pt-BR");
          } catch {
            return null;
          }
        })()
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={isDownloading ? undefined : onDismiss}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-sm mx-4 border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <ArrowUpCircle size={16} className="text-blue-600" />
            <h2 className="text-sm font-semibold">
              {status === "ready"
                ? "Atualização pronta"
                : status === "error"
                  ? "Erro na atualização"
                  : "Nova versão disponível"}
            </h2>
          </div>
          {!isDownloading && (
            <button
              onClick={onDismiss}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Corpo */}
        <div className="p-4 space-y-3">
          {status === "error" ? (
            <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{errorMessage ?? "Erro desconhecido ao atualizar."}</p>
            </div>
          ) : (
            <>
              {updateInfo && (
                <div className="text-sm">
                  <p className="text-gray-700 dark:text-gray-300">
                    Versão{" "}
                    <span className="font-semibold">{updateInfo.version}</span>{" "}
                    está disponível.
                  </p>
                  {formattedDate && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Lançada em {formattedDate}
                    </p>
                  )}
                  {updateInfo.body && (
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-2 max-h-28 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {updateInfo.body}
                    </div>
                  )}
                </div>
              )}

              {isDownloading && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                    <span>Baixando atualização...</span>
                    <span>{downloadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {status === "ready" && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>
                    Download concluído. Reinicie o app para aplicar a
                    atualização.
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé com ações */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          {status === "error" && (
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Fechar
            </button>
          )}

          {status === "available" && (
            <>
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Agora não
              </button>
              <button
                onClick={onDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download size={14} />
                Baixar e instalar
              </button>
            </>
          )}

          {isDownloading && (
            <button
              disabled
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-blue-600 text-white opacity-70 cursor-not-allowed"
            >
              <RefreshCw size={14} className="animate-spin" />
              Baixando...
            </button>
          )}

          {status === "ready" && (
            <button
              onClick={onRelaunch}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-green-600 hover:bg-green-700 text-white"
            >
              <RefreshCw size={14} />
              Reiniciar agora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
