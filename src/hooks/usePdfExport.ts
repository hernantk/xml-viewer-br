import { useState, useCallback } from "react";
import { useDocumentStore } from "@/store/documentStore";
import { getPdfBaseName } from "@/utils/documentFileNames";

/**
 * Try to export the PDF using the native WebView2 `PrintToPdf` Tauri command.
 * Returns `true` if the native path succeeded; `false` otherwise (caller should
 * fall back to the html2canvas approach).
 */
async function tryNativePrintToPdf(outputPath: string): Promise<boolean> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("print_to_pdf", { outputPath });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fallback: generate the PDF using html2canvas + jsPDF and save/download it.
 */
async function fallbackHtml2CanvasPdf(
  defaultName: string,
  downloadDir: string,
): Promise<void> {
  const viewerEl = document.getElementById("document-viewer-content");
  if (!viewerEl) {
    throw new Error("Elemento do viewer não encontrado");
  }

  const { generatePdfFromElement } = await import("@/services/pdfGenerator");
  const pdfBytes = await generatePdfFromElement(viewerEl, defaultName);

  try {
    const { writeFile } = await import("@tauri-apps/plugin-fs");

    if (downloadDir) {
      const sep = downloadDir.includes("\\") ? "\\" : "/";
      const filePath = `${downloadDir}${sep}${defaultName}.pdf`;
      await writeFile(filePath, pdfBytes);
    } else {
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
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${defaultName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export function usePdfExport() {
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const downloadDir = useDocumentStore((s) => s.downloadDir);

  const exportPdf = useCallback(async () => {
    if (!currentDocument) return;

    setExporting(true);
    try {
      const defaultName = getPdfBaseName(currentDocument);

      // ------------------------------------------------------------------
      // Strategy: try the native WebView2 PrintToPdf first (vector PDF,
      // selectable text, honours @media print CSS).  Fall back to the
      // html2canvas raster approach for non-Windows / browser dev mode.
      // ------------------------------------------------------------------

      let outputPath: string | null = null;

      // Resolve the destination path *before* calling the native command.
      try {
        if (downloadDir) {
          const sep = downloadDir.includes("\\") ? "\\" : "/";
          outputPath = `${downloadDir}${sep}${defaultName}.pdf`;
        } else {
          const { save } = await import("@tauri-apps/plugin-dialog");
          outputPath = await save({
            defaultPath: `${defaultName}.pdf`,
            filters: [{ name: "PDF", extensions: ["pdf"] }],
          });
        }
      } catch {
        // Not in Tauri — will use fallback below.
        outputPath = null;
      }

      if (outputPath) {
        const nativeOk = await tryNativePrintToPdf(outputPath);
        if (nativeOk) return; // Done — native PDF saved.
      }

      // Fallback to html2canvas + jsPDF
      await fallbackHtml2CanvasPdf(defaultName, downloadDir);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert(
        "Erro ao gerar PDF: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setExporting(false);
    }
  }, [currentDocument, downloadDir]);

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
