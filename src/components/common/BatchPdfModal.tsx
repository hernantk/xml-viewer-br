import { FolderOpen, Loader2, Package, TriangleAlert, X } from "lucide-react";
import type {
  BatchErrorItem,
  BatchProgress,
  BatchSummary,
  ParsedDocument,
} from "@/types/common";
import { BatchRenderSurface } from "@/components/viewers/BatchRenderSurface";

interface BatchPdfModalProps {
  open: boolean;
  isRunning: boolean;
  sourceDir: string;
  outputDir: string;
  zipFileName: string;
  progress: BatchProgress;
  currentFileName: string;
  summary: BatchSummary | null;
  errors: BatchErrorItem[];
  validationMessage: string;
  sourceFileCount: number;
  batchDocument: ParsedDocument | null;
  canRun: boolean;
  onClose: () => void;
  onPickSourceDir: () => Promise<void>;
  onPickOutputDir: () => Promise<void>;
  onRunBatch: () => Promise<void>;
  onZipFileNameChange: (value: string) => void;
  onOutputDirChange: (value: string) => void;
}

const MAX_VISIBLE_ERRORS = 4;

export function BatchPdfModal({
  open,
  isRunning,
  sourceDir,
  outputDir,
  zipFileName,
  progress,
  currentFileName,
  summary,
  errors,
  validationMessage,
  sourceFileCount,
  batchDocument,
  canRun,
  onClose,
  onPickSourceDir,
  onPickOutputDir,
  onRunBatch,
  onZipFileNameChange,
  onOutputDirChange,
}: BatchPdfModalProps) {
  if (!open) {
    return null;
  }

  const progressPercent =
    progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;
  const visibleErrors = errors.slice(0, MAX_VISIBLE_ERRORS);
  const hiddenErrorCount = Math.max(0, errors.length - visibleErrors.length);
  const primaryActionLabel =
    summary && !summary.outputPath && summary.generated > 0 ? "Tentar salvar ZIP" : "Gerar ZIP";

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
        onClick={isRunning ? undefined : onClose}
      >
        <div
          className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Processo em lote XML para PDF
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Processa uma pasta de XML e entrega um ZIP com um PDF por documento.
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isRunning}
              className="rounded p-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800"
              title="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pasta de origem
                </label>
                <input
                  type="text"
                  readOnly
                  value={sourceDir}
                  placeholder="Selecione a pasta com os XMLs"
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {sourceDir
                    ? `${sourceFileCount} arquivo(s) XML encontrado(s) na raiz da pasta.`
                    : "A leitura nao entra em subpastas nesta versao."}
                </p>
              </div>
              <button
                type="button"
                onClick={onPickSourceDir}
                disabled={isRunning}
                className="inline-flex items-center justify-center gap-2 rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                <FolderOpen size={16} />
                Escolher pasta
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pasta de saida
                </label>
                <input
                  type="text"
                  value={outputDir}
                  onChange={(e) => onOutputDirChange(e.target.value)}
                  placeholder="Salvar via dialogo se vazio"
                  disabled={isRunning}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-70 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nome do ZIP
                </label>
                <input
                  type="text"
                  value={zipFileName}
                  onChange={(e) => onZipFileNameChange(e.target.value)}
                  disabled={isRunning}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-70 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                />
              </div>
              <button
                type="button"
                onClick={onPickOutputDir}
                disabled={isRunning}
                className="inline-flex items-center justify-center gap-2 rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                <FolderOpen size={16} />
                Saida
              </button>
            </div>

            {(validationMessage || summary) && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
                {validationMessage && (
                  <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                    <p>{validationMessage}</p>
                  </div>
                )}
                {summary && (
                  <div className={`grid gap-2 text-sm ${validationMessage ? "mt-3" : ""}`}>
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      Resumo da ultima execucao
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      Origem: <span className="font-medium">{summary.sourceDir}</span>
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      PDFs gerados: <span className="font-medium">{summary.generated}</span> de{" "}
                      {summary.totalFound}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      Ignorados: <span className="font-medium">{summary.skipped}</span>
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      ZIP:{" "}
                      <span className="font-medium">
                        {summary.outputPath ?? "Gerado em memoria, aguardando salvamento"}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100">
                    Progresso
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    {progress.processed} de {progress.total} processado(s)
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                  <p>Validos: {progress.succeeded}</p>
                  <p>Ignorados: {progress.failed}</p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-blue-600 transition-[width] duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-2 min-h-5 text-xs text-gray-500 dark:text-gray-400">
                {isRunning
                  ? currentFileName
                    ? `Processando ${currentFileName}`
                    : "Preparando lote..."
                  : sourceDir && sourceFileCount > 0
                    ? `Pronto para gerar ${sourceFileCount} PDF(s) e compactar no ZIP final.`
                    : "Selecione uma pasta para preparar o lote."}
              </p>
            </div>

            {errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
                  <TriangleAlert size={16} />
                  Arquivos ignorados
                </div>
                <div className="space-y-2 text-xs text-red-700 dark:text-red-300">
                  {visibleErrors.map((error) => (
                    <div key={`${error.fileName}-${error.reason}`} className="rounded border border-red-200/80 px-2 py-1.5 dark:border-red-900/40">
                      <p className="font-medium">{error.fileName}</p>
                      <p>{error.reason}</p>
                    </div>
                  ))}
                  {hiddenErrorCount > 0 && (
                    <p className="text-red-600 dark:text-red-400">
                      Mais {hiddenErrorCount} erro(s) nao exibido(s).
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isRunning}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => void onRunBatch()}
                disabled={!canRun && !(summary && !summary.outputPath && summary.generated > 0) || isRunning}
                className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                {isRunning ? "Gerando..." : primaryActionLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
      <BatchRenderSurface document={batchDocument} />
    </>
  );
}
