import { FileText } from "lucide-react";
import { useFileOpen } from "@/hooks/useFileOpen";

export function EmptyState() {
  const { openFile } = useFileOpen();

  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
      <FileText size={64} strokeWidth={1} />
      <h2 className="mt-4 text-xl font-medium">Nenhum documento aberto</h2>
      <p className="mt-2 text-sm">
        Arraste um arquivo XML aqui ou{" "}
        <button
          onClick={openFile}
          className="text-blue-500 hover:text-blue-600 underline"
        >
          clique para abrir
        </button>
      </p>
      <p className="mt-1 text-xs">
        Suporta NF-e (DANFE), CT-e (DACTe) e NFS-e
      </p>
    </div>
  );
}
