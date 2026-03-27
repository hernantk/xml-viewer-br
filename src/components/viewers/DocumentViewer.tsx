import { useDocumentStore } from "@/store/documentStore";
import { DANFEViewer } from "./DANFEViewer";
import { DACTeViewer } from "./DACTeViewer";
import { NFSeViewer } from "./NFSeViewer";
import { AlertTriangle, Loader2 } from "lucide-react";

export function DocumentViewer() {
  const doc = useDocumentStore((s) => s.currentDocument);
  const loading = useDocumentStore((s) => s.loading);
  const error = useDocumentStore((s) => s.error);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <span className="ml-3 text-gray-500">Carregando documento...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <AlertTriangle size={48} />
        <p className="mt-3 text-lg font-medium">Erro ao carregar documento</p>
        <p className="mt-1 text-sm text-gray-500 max-w-md text-center">
          {error}
        </p>
      </div>
    );
  }

  if (!doc) return null;

  switch (doc.documentType) {
    case "nfe":
      return doc.nfe ? <DANFEViewer nfe={doc.nfe} /> : null;
    case "cte":
      return doc.cte ? <DACTeViewer cte={doc.cte} /> : null;
    case "nfse":
      return doc.nfse ? <NFSeViewer nfse={doc.nfse} /> : null;
    default:
      return null;
  }
}
