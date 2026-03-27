import type { ParsedDocument } from "@/types/common";
import { DANFEViewer } from "./DANFEViewer";
import { DACTeViewer } from "./DACTeViewer";
import { NFSeViewer } from "./NFSeViewer";

interface BatchRenderSurfaceProps {
  document: ParsedDocument | null;
}

export function BatchRenderSurface({ document }: BatchRenderSurfaceProps) {
  if (!document) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-[200vw] top-0 h-0 overflow-hidden opacity-0"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed -left-[200vw] top-0 w-[794px] overflow-hidden opacity-0"
    >
      <div id="batch-document-viewer-content">
        {document.documentType === "nfe" && document.nfe ? (
          <DANFEViewer nfe={document.nfe} />
        ) : document.documentType === "cte" && document.cte ? (
          <DACTeViewer cte={document.cte} />
        ) : document.documentType === "nfse" && document.nfse ? (
          <NFSeViewer nfse={document.nfse} />
        ) : null}
      </div>
    </div>
  );
}
