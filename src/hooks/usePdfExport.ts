import { useState, useCallback } from "react";
import { useDocumentStore } from "@/store/documentStore";
import { generatePdfFromElement } from "@/services/pdfGenerator";

export function usePdfExport() {
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const currentFilePath = useDocumentStore((s) => s.currentFilePath);

  const exportPdf = useCallback(async () => {
    if (!currentDocument) return;

    setExporting(true);
    try {
      const viewerEl = document.getElementById("document-viewer-content");
      if (!viewerEl) {
        throw new Error("Elemento do viewer não encontrado");
      }

      const docType = currentDocument.documentType;
      let defaultName = "documento";
      if (docType === "nfe" && currentDocument.nfe) {
        const nfe = currentDocument.nfe;
        const nNF = nfe.infNFe.ide.nNF;
        const serie = nfe.infNFe.ide.serie;
        defaultName = `DANFE_${nNF}_serie${serie}`;
      } else if (docType === "cte" && currentDocument.cte) {
        const cte = currentDocument.cte;
        const nCT = cte.infCte.ide.nCT;
        defaultName = `DACTe_${nCT}`;
      } else if (docType === "nfse" && currentDocument.nfse) {
        const nfse = currentDocument.nfse;
        const numero = nfse.nfse.infNfse.numero;
        defaultName = `NFSe_${numero}`;
      }

      const pdfBytes = await generatePdfFromElement(viewerEl, defaultName);

      // Try to save via Tauri dialog
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeFile } = await import("@tauri-apps/plugin-fs");

        const outputPath = await save({
          defaultPath: `${defaultName}.pdf`,
          filters: [{ name: "PDF", extensions: ["pdf"] }],
        });

        if (outputPath) {
          await writeFile(outputPath, pdfBytes);
        }
      } catch {
        // Fallback: browser download
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${defaultName}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert(
        "Erro ao gerar PDF: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setExporting(false);
    }
  }, [currentDocument, currentFilePath]);

  const printPdf = useCallback(async () => {
    if (!currentDocument) return;

    setPrinting(true);
    try {
      const viewerEl = document.getElementById("document-viewer-content");
      if (!viewerEl) {
        throw new Error("Elemento do viewer não encontrado");
      }

      const docType = currentDocument.documentType;
      let defaultName = "documento";
      if (docType === "nfe" && currentDocument.nfe) {
        const nfe = currentDocument.nfe;
        const nNF = nfe.infNFe.ide.nNF;
        const serie = nfe.infNFe.ide.serie;
        defaultName = `DANFE_${nNF}_serie${serie}`;
      } else if (docType === "cte" && currentDocument.cte) {
        const cte = currentDocument.cte;
        const nCT = cte.infCte.ide.nCT;
        defaultName = `DACTe_${nCT}`;
      } else if (docType === "nfse" && currentDocument.nfse) {
        const nfse = currentDocument.nfse;
        const numero = nfse.nfse.infNfse.numero;
        defaultName = `NFSe_${numero}`;
      }

      const pdfBytes = await generatePdfFromElement(viewerEl, defaultName);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const printFrame = document.createElement("iframe");
      printFrame.style.position = "fixed";
      printFrame.style.left = "-9999px";
      printFrame.style.top = "-9999px";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.src = url;
      document.body.appendChild(printFrame);

      printFrame.onload = () => {
        try {
          printFrame.contentWindow?.print();
        } catch {
          // Fallback: open in new tab for manual printing
          window.open(url, "_blank");
        }
        setTimeout(() => {
          document.body.removeChild(printFrame);
          URL.revokeObjectURL(url);
        }, 1000);
      };
    } catch (err) {
      console.error("Erro ao imprimir:", err);
      alert(
        "Erro ao imprimir: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setPrinting(false);
    }
  }, [currentDocument, currentFilePath]);

  return { exportPdf, exporting, printPdf, printing };
}
