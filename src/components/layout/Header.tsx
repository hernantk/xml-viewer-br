import { useState } from "react";
import {
  FolderOpen,
  FileDown,
  Printer,
  Files,
  ShieldCheck,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
  Settings,
  ArrowUpCircle,
  RefreshCw,
} from "lucide-react";
import { useDocumentStore } from "@/store/documentStore";
import { useFileOpen } from "@/hooks/useFileOpen";
import { usePdfExport } from "@/hooks/usePdfExport";
import { SettingsModal } from "@/components/common/SettingsModal";
import { BatchPdfModal } from "@/components/common/BatchPdfModal";
import { useBatchPdfExport } from "@/hooks/useBatchPdfExport";
import { isTauriRuntime } from "@/utils/runtime";
import type { UpdaterStatus } from "@/hooks/useUpdater";

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  hasUpdate?: boolean;
  updateStatus?: UpdaterStatus;
  updateVersion?: string;
  onShowUpdate?: () => void;
}

export function Header({
  sidebarOpen,
  onToggleSidebar,
  hasUpdate,
  updateStatus,
  updateVersion,
  onShowUpdate,
}: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const validation = useDocumentStore((s) => s.validation);
  const theme = useDocumentStore((s) => s.theme);
  const toggleTheme = useDocumentStore((s) => s.toggleTheme);
  const downloadDir = useDocumentStore((s) => s.downloadDir);
  const { openFile, importNotice } = useFileOpen();
  const { exportPdf, exporting, printPdf, printing } = usePdfExport();
  const batchPdf = useBatchPdfExport({ initialOutputDir: downloadDir });
  const showBatchButton = isTauriRuntime();

  return (
    <>
    <header className="h-12 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-3 gap-2 no-print">
      <button
        onClick={onToggleSidebar}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        title={sidebarOpen ? "Fechar sidebar" : "Abrir sidebar"}
      >
        {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
      </button>

      <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

      <button
        onClick={openFile}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        title="Abrir XML (Ctrl+O)"
      >
        <FolderOpen size={16} />
        Abrir
      </button>

      {showBatchButton && (
        <button
          onClick={batchPdf.openModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Gerar PDFs em lote"
        >
          <Files size={16} />
          Lote PDF
        </button>
      )}

      {currentDocument && (
        <>
          <button
            onClick={exportPdf}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            title="Exportar PDF (Ctrl+P)"
          >
            <FileDown size={16} />
            {exporting ? "Exportando..." : "PDF"}
          </button>

          <button
            onClick={printPdf}
            disabled={printing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            title="Imprimir"
          >
            <Printer size={16} />
            {printing ? "Imprimindo..." : "Imprimir"}
          </button>

          {validation && (
            <div className="flex items-center gap-1.5 text-sm ml-2">
              <ShieldCheck
                size={16}
                className={
                  validation.signatureValid
                    ? "text-green-600"
                    : "text-red-500"
                }
              />
              <span
                className={
                  validation.signatureValid
                    ? "text-green-600"
                    : "text-red-500"
                }
              >
                {validation.signatureValid
                  ? "Assinatura válida"
                  : "Assinatura inválida"}
              </span>
            </div>
          )}
        </>
      )}

      <div className="flex-1" />

      {hasUpdate && onShowUpdate && (
        updateStatus === "ready" ? (
          <button
            onClick={onShowUpdate}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/40 dark:hover:bg-green-900/60 dark:text-green-400 font-medium transition-colors"
            title="Atualização baixada — clique para reiniciar"
          >
            <RefreshCw size={13} />
            Reiniciar para atualizar
          </button>
        ) : (
          <button
            onClick={onShowUpdate}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 dark:text-amber-400 font-medium transition-colors"
            title={updateVersion ? `Nova versão disponível: v${updateVersion}` : "Nova versão disponível"}
          >
            <ArrowUpCircle size={13} />
            {updateVersion ? `v${updateVersion} disponível` : "Atualização disponível"}
          </button>
        )
      )}

      <button
        onClick={() => setSettingsOpen(true)}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        title="Configurações"
      >
        <Settings size={18} />
      </button>

      <button
        onClick={toggleTheme}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        title="Alternar tema"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <BatchPdfModal
        open={batchPdf.isOpen}
        isRunning={batchPdf.isRunning}
        sourceDir={batchPdf.sourceDir}
        outputDir={batchPdf.outputDir}
        zipFileName={batchPdf.zipFileName}
        progress={batchPdf.progress}
        currentFileName={batchPdf.currentFileName}
        summary={batchPdf.summary}
        errors={batchPdf.errors}
        validationMessage={batchPdf.validationMessage}
        sourceFileCount={batchPdf.sourceFileCount}
        batchDocument={batchPdf.batchDocument}
        canRun={batchPdf.canRun}
        onClose={batchPdf.closeModal}
        onPickSourceDir={batchPdf.pickSourceDir}
        onPickOutputDir={batchPdf.pickOutputDir}
        onRunBatch={batchPdf.runBatch}
        onZipFileNameChange={batchPdf.setZipFileName}
        onOutputDirChange={batchPdf.setOutputDir}
      />
    </header>
    {importNotice && (
      <div className="fixed bottom-4 right-4 z-50 bg-green-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
        {importNotice}
      </div>
    )}
    </>
  );
}
