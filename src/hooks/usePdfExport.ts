import { useState, useCallback } from "react";
import { useDocumentStore } from "@/store/documentStore";
import { generatePdfFromElement } from "@/services/pdfGenerator";

export function usePdfExport() {
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const downloadDir = useDocumentStore((s) => s.downloadDir);

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

      // Try to save via Tauri
      try {
        const { writeFile } = await import("@tauri-apps/plugin-fs");

        if (downloadDir) {
          // Save directly without dialog
          const sep = downloadDir.includes("\\") ? "\\" : "/";
          const filePath = `${downloadDir}${sep}${defaultName}.pdf`;
          await writeFile(filePath, pdfBytes);
        } else {
          // No dir configured — use save dialog
          const { save } = await import("@tauri-apps/plugin-dialog");
          const outputPath = await save({
            defaultPath: `${defaultName}.pdf`,
            filters: [{ name: "PDF", extensions: ["pdf"] }],
          });
          if (outputPath) {
            await writeFile(outputPath, pdfBytes);
          }
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
  }, [currentDocument]);

  const printPdf = useCallback(async () => {
    if (!currentDocument) return;

    setPrinting(true);
    try {
      // Use native print dialog (works in both browser and Tauri WebView2)
      window.print();
    } catch (err) {
      console.error("Erro ao imprimir:", err);
      alert(
        "Erro ao imprimir: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setPrinting(false);
    }
  }, [currentDocument]);

  return { exportPdf, exporting, printPdf, printing };
}
