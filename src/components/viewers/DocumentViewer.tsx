import { useDocumentStore } from "@/store/documentStore";
import { DANFEViewer } from "./DANFEViewer";
import { DACTeViewer } from "./DACTeViewer";
import { NFSeViewer } from "./NFSeViewer";
import { AlertTriangle, Copy, Check, Download, Loader2 } from "lucide-react";
import { getDocumentMeta } from "@/utils/documentMeta";
import { useState } from "react";

export function DocumentViewer() {
  const doc = useDocumentStore((s) => s.currentDocument);
  const loading = useDocumentStore((s) => s.loading);
  const error = useDocumentStore((s) => s.error);
  const currentXml = useDocumentStore((s) => s.currentXml);
  const [copied, setCopied] = useState(false);

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

  let chave = "";
  if (doc.documentType === "nfe" && doc.nfe) {
    chave = doc.nfe.infNFe.id.replace(/^NFe/, "");
  } else if (doc.documentType === "cte" && doc.cte) {
    chave = doc.cte.infCte.id.replace(/^CTe/, "");
  } else if (doc.documentType === "nfse" && doc.nfse) {
    chave = doc.nfse.nfse.infNfse.codigoVerificacao;
  }

  const handleCopyKey = async () => {
    if (!chave) return;
    await navigator.clipboard.writeText(chave);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadXml = () => {
    if (!currentXml) return;
    const blob = new Blob([currentXml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${documentName.replace(/[^a-zA-Z0-9áéíóúãõçÁÉÍÓÚÃÕÇ _\-–—]/g, "_")}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

        {chave && (
          <button
            onClick={handleCopyKey}
            className="ml-auto flex items-center gap-1.5 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
            title={`Copiar chave: ${chave}`}
          >
            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            {copied ? "Copiado!" : "Copiar chave"}
          </button>
        )}

        {currentXml && (
          <button
            onClick={handleDownloadXml}
            className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors ${!chave ? "ml-auto" : ""}`}
            title="Baixar XML"
          >
            <Download size={13} />
            Baixar XML
          </button>
        )}
      </div>

      <div id="document-viewer-content">{viewer}</div>
    </div>
  );
}
