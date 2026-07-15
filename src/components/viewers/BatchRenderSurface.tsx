import type { PrintableDocument } from "@/types/common";
import { DANFEViewer } from "./DANFEViewer";
import { DACTeViewer } from "./DACTeViewer";
import { NFSeViewer } from "./NFSeViewer";
import { SpedNFSeViewer } from "./SpedNFSeViewer";
import { GenericXmlViewer } from "./GenericXmlViewer";
import { EditedDocumentWatermark } from "./EditedDocumentWatermark";

interface BatchRenderSurfaceProps {
  printable: PrintableDocument | null;
  contentId?: string;
}

export function BatchRenderSurface({ printable, contentId = "batch-document-viewer-content" }: BatchRenderSurfaceProps) {
  if (!printable) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-[200vw] top-0 h-0 overflow-hidden opacity-0"
      />
    );
  }

  const { document, edited, xml } = printable;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed -left-[200vw] top-0 w-[794px] overflow-hidden opacity-0"
    >
      <div id={contentId} className="relative">
        {document.documentType === "nfe" && document.nfe ? (
          <DANFEViewer nfe={document.nfe} />
        ) : document.documentType === "cte" && document.cte ? (
          <DACTeViewer cte={document.cte} />
        ) : document.documentType === "nfse" && document.nfse ? (
          <NFSeViewer nfse={document.nfse} />
        ) : document.documentType === "nfse-sped" && document.spedNfse ? (
          <SpedNFSeViewer nfse={document.spedNfse} />
        ) : document.documentType === "xml" ? (
          <GenericXmlViewer xml={xml} />
        ) : null}
        {edited && <EditedDocumentWatermark />}
      </div>
    </div>
  );
}
