import { useEffect, useState } from "react";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { useDocumentStore } from "@/store/documentStore";
import { parseXml } from "@/services/xmlParser";
import type { ParsedDocument } from "@/types/common";
import { DANFEViewer } from "./DANFEViewer";
import { DACTeViewer } from "./DACTeViewer";
import { NFSeViewer } from "./NFSeViewer";
import { SpedNFSeViewer } from "./SpedNFSeViewer";

function waitForPrintLayout() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 250);
      });
    });
  });
}

function renderDocument(document: ParsedDocument) {
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
  return null;
}

export function HiddenPdfRenderer() {
  const [document, setDocument] = useState<ParsedDocument | null>(null);
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
          throw new Error("Parametros de renderizacao de PDF invalidos.");
        }

        const content = await getRecentFileContent(fileId);
        const parsedDocument = parseXml(content);
        if (cancelled) return;

        setDocument(parsedDocument);
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
      <div id="document-viewer-content">
        {document ? renderDocument(document) : null}
      </div>
    </main>
  );
}
