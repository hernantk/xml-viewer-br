import { useState, useCallback } from "react";
import { useDocumentStore } from "@/store/documentStore";
import { getPdfBaseName } from "@/utils/documentFileNames";
import { isTauriRuntime } from "@/utils/runtime";

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
 * Returns the saved file path when available.
 */
async function fallbackHtml2CanvasPdf(
  defaultName: string,
  downloadDir: string,
): Promise<string | null> {
  const viewerEl = document.getElementById("document-viewer-content");
  if (!viewerEl) {
    throw new Error("Elemento do viewer nao encontrado");
  }

  const { generatePdfFromElement } = await import("@/services/pdfGenerator");
  const pdfBytes = await generatePdfFromElement(viewerEl, defaultName);

  try {
    const { writeFile } = await import("@tauri-apps/plugin-fs");

    if (downloadDir) {
      const sep = downloadDir.includes("\\") ? "\\" : "/";
      const filePath = `${downloadDir}${sep}${defaultName}.pdf`;
      await writeFile(filePath, pdfBytes);
      return filePath;
    }

    const { save } = await import("@tauri-apps/plugin-dialog");
    const outputPath = await save({
      defaultPath: `${defaultName}.pdf`,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });

    if (outputPath) {
      await writeFile(outputPath, pdfBytes);
      return outputPath;
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

  return null;
}

export function usePdfExport() {
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [exportNotice, setExportNotice] = useState("");
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const downloadDir = useDocumentStore((s) => s.downloadDir);

  const exportPdf = useCallback(async () => {
    if (!currentDocument) return;

    setExporting(true);
    setExportNotice("");

    try {
      const defaultName = getPdfBaseName(currentDocument);
      const tauriRuntime = isTauriRuntime();

      // ------------------------------------------------------------------
      // Strategy: try the native WebView2 PrintToPdf first (vector PDF,
      // selectable text, honours @media print CSS). Fall back to the
      // html2canvas raster approach for non-Windows / browser dev mode.
      // ------------------------------------------------------------------
      let outputPath: string | null = null;

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
        outputPath = null;
      }

      if (outputPath) {
        const nativeOk = await tryNativePrintToPdf(outputPath);
        if (nativeOk) {
          if (tauriRuntime) {
            setExportNotice(`Exportação concluída com sucesso. Salvo em ${outputPath}`);
            setTimeout(() => setExportNotice(""), 3500);
          }
          return;
        }
      }

      const savedPath = await fallbackHtml2CanvasPdf(defaultName, downloadDir);
      if (tauriRuntime && savedPath) {
        setExportNotice(`Exportação concluída com sucesso. Salvo em ${savedPath}`);
        setTimeout(() => setExportNotice(""), 3500);
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
  }, [currentDocument, downloadDir]);

  const printPdf = useCallback(async () => {
    if (!currentDocument) return;

    setPrinting(true);
    try {
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

  return { exportPdf, exporting, printPdf, printing, exportNotice };
}
