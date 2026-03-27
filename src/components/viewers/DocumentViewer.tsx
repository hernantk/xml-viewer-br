import { useDocumentStore } from "@/store/documentStore";
import { DANFEViewer } from "./DANFEViewer";
import { DACTeViewer } from "./DACTeViewer";
import { NFSeViewer } from "./NFSeViewer";
import { AlertTriangle, Loader2 } from "lucide-react";
import { getDocumentMeta } from "@/utils/documentMeta";

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

  const documentMeta = getDocumentMeta(doc.documentType);
  const DocumentIcon = documentMeta.icon;

  let documentName = "Documento XML";
  if (doc.documentType === "nfe" && doc.nfe) {
    const { nNF, serie } = doc.nfe.infNFe.ide;
    documentName = `NF-e nº ${nNF} — Série ${serie}`;
  } else if (doc.documentType === "cte" && doc.cte) {
    const { nCT } = doc.cte.infCte.ide;
    documentName = `CT-e nº ${nCT}`;
  } else if (doc.documentType === "nfse" && doc.nfse) {
    const { numero } = doc.nfse.nfse.infNfse;
    documentName = `NFS-e nº ${numero}`;
  }

  let viewer = null;
  switch (doc.documentType) {
    case "nfe":
      viewer = doc.nfe ? <DANFEViewer nfe={doc.nfe} /> : null;
      break;
    case "cte":
      viewer = doc.cte ? <DACTeViewer cte={doc.cte} /> : null;
      break;
    case "nfse":
      viewer = doc.nfse ? <NFSeViewer nfse={doc.nfse} /> : null;
      break;
  }

  return (
    <div className="p-3 md:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700 no-print">
        <div className="flex min-w-0 items-center gap-2">
          <div className="text-gray-600 dark:text-gray-300">
            <DocumentIcon size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
              {documentName}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${documentMeta.badgeClassName}`}
        >
          {documentMeta.label}
        </span>
      </div>

      <div id="document-viewer-content">{viewer}</div>
    </div>
  );
}
