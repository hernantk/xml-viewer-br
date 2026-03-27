import {
  FolderOpen,
  FileDown,
  ShieldCheck,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
} from "lucide-react";
import { useDocumentStore } from "@/store/documentStore";
import { useFileOpen } from "@/hooks/useFileOpen";
import { usePdfExport } from "@/hooks/usePdfExport";

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const validation = useDocumentStore((s) => s.validation);
  const theme = useDocumentStore((s) => s.theme);
  const toggleTheme = useDocumentStore((s) => s.toggleTheme);
  const { openFile } = useFileOpen();
  const { exportPdf, exporting } = usePdfExport();

  return (
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

      <button
        onClick={toggleTheme}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        title="Alternar tema"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
}
