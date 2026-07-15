import { useEffect, useState } from "react";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { useDocumentStore } from "@/store/documentStore";
import { parseXml } from "@/services/xmlParser";
import type { ParsedDocument, PrintableDocument } from "@/types/common";
import { DANFEViewer } from "./DANFEViewer";
import { DACTeViewer } from "./DACTeViewer";
import { NFSeViewer } from "./NFSeViewer";
import { SpedNFSeViewer } from "./SpedNFSeViewer";
import { GenericXmlViewer } from "./GenericXmlViewer";
import { EditedDocumentWatermark } from "./EditedDocumentWatermark";

function waitForPrintLayout() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 250);
      });
    });
  });
}

function renderDocument(document: ParsedDocument, xml: string) {
  if (document.documentType === "nfe" && document.nfe) {
    return <DANFEViewer nfe={document.nfe} />;
  }
  if (document.documentType === "cte" && document.cte) {
    return <DACTeViewer cte={document.cte} />;
  }
  if (document.documentType === "nfse" && document.nfse) {
    return <NFSeViewer nfse={document.nfse} />;
  }
  if (document.documentType === "nfse-sped" && document.spedNfse) {
    return <SpedNFSeViewer nfse={document.spedNfse} />;
  }
  if (document.documentType === "xml") {
    return <GenericXmlViewer xml={xml} />;
  }
  return null;
}

export function HiddenPdfRenderer() {
  const [printable, setPrintable] = useState<PrintableDocument | null>(null);
  const getRecentFileContent = useDocumentStore((s) => s.getRecentFileContent);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const params = new URLSearchParams(window.location.search);
      const label = params.get("label") ?? "";
      const fileId = params.get("fileId") ?? "";
      const outputPath = params.get("outputPath") ?? "";

      try {
        if (!label || !fileId || !outputPath) {
          throw new Error("Parâmetros de renderização de PDF inválidos.");
        }

        const { content, edited } = await getRecentFileContent(fileId);
        const parsedDocument = parseXml(content);
        if (cancelled) return;

        setPrintable({ document: parsedDocument, xml: content, edited });
        await waitForPrintLayout();
        await invoke("print_to_pdf", { outputPath });
        await emit("recent-pdf-rendered", { label, ok: true });
      } catch (err) {
        await emit("recent-pdf-rendered", {
          label,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        window.setTimeout(() => {
          void getCurrentWindow().close();
        }, 100);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [getRecentFileContent]);

  return (
    <main className="min-h-screen bg-white text-black print:bg-white">
      <div id="document-viewer-content" className="relative">
        {printable
          ? renderDocument(printable.document, printable.xml)
          : null}
        {printable?.edited && <EditedDocumentWatermark />}
      </div>
    </main>
  );
}
