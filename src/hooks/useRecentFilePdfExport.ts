import { useCallback, useState } from "react";
import { useDocumentStore } from "@/store/documentStore";
import { parseXml } from "@/services/xmlParser";
import { generatePdfFromElement } from "@/services/pdfGenerator";
import { getPdfBaseName } from "@/utils/documentFileNames";
import { isTauriRuntime } from "@/utils/runtime";
import type { ParsedDocument } from "@/types/common";

const RENDER_SURFACE_ID = "recent-document-viewer-content";

function joinPath(dir: string, fileName: string) {
  const sep = dir.includes("\\") ? "\\" : "/";
  return `${dir}${sep}${fileName}`;
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

async function writePdfFile(path: string, bytes: Uint8Array) {
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  await writeFile(path, bytes);
}

async function generateNativePdfInHiddenWindow(
  fileId: string,
  outputPath: string,
) {
  const [{ invoke }, { listen }] = await Promise.all([
    import("@tauri-apps/api/core"),
    import("@tauri-apps/api/event"),
  ]);
  const label = `pdf-renderer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const query = new URLSearchParams({
    pdfRenderer: "1",
    label,
    fileId,
    outputPath,
  });

  await new Promise<void>(async (resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      void unlisten.then((dispose) => dispose());
      reject(new Error("Timeout ao gerar PDF em janela oculta."));
    }, 30000);

    const unlisten = listen<{
      label: string;
      ok: boolean;
      error?: string;
    }>("recent-pdf-rendered", (event) => {
      if (event.payload.label !== label) return;

      window.clearTimeout(timeoutId);
      void unlisten.then((dispose) => dispose());

      if (event.payload.ok) {
        resolve();
      } else {
        reject(new Error(event.payload.error || "Falha ao gerar PDF."));
      }
    });

    try {
      await invoke("create_pdf_render_window", {
        label,
        url: `index.html?${query.toString()}`,
      });
    } catch (err) {
      window.clearTimeout(timeoutId);
      void unlisten.then((dispose) => dispose());
      reject(err);
    }
  });
}

export function useRecentFilePdfExport() {
  const [renderDocument, setRenderDocument] = useState<ParsedDocument | null>(null);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [exportNotice, setExportNotice] = useState("");
  const getRecentFileContent = useDocumentStore((s) => s.getRecentFileContent);
  const downloadDir = useDocumentStore((s) => s.downloadDir);

  const preparePdf = useCallback(
    async (fileId: string) => {
      const content = await getRecentFileContent(fileId);
      const parsedDocument = parseXml(content);
      const defaultName = getPdfBaseName(parsedDocument);

      setRenderDocument(parsedDocument);
      await waitForNextPaint();

      const viewerEl = window.document.getElementById(RENDER_SURFACE_ID);
      if (!viewerEl) {
        throw new Error("Superficie de renderizacao do PDF nao encontrada.");
      }

      const pdfBytes = await generatePdfFromElement(viewerEl, defaultName);
      return { defaultName, pdfBytes };
    },
    [getRecentFileContent],
  );

  const getDefaultName = useCallback(
    async (fileId: string) => {
      const content = await getRecentFileContent(fileId);
      return getPdfBaseName(parseXml(content));
    },
    [getRecentFileContent],
  );

  const exportRecentPdf = useCallback(
    async (fileId: string) => {
      if (exporting) return;

      setExporting(true);
      setExportNotice("");

      try {
        const tauriRuntime = isTauriRuntime();
        const defaultName = tauriRuntime
          ? await getDefaultName(fileId)
          : (await preparePdf(fileId)).defaultName;
        let outputPath: string | null = null;

        if (downloadDir) {
          outputPath = joinPath(downloadDir, `${defaultName}.pdf`);
        } else if (isTauriRuntime()) {
          const { save } = await import("@tauri-apps/plugin-dialog");
          outputPath = await save({
            defaultPath: `${defaultName}.pdf`,
            filters: [{ name: "PDF", extensions: ["pdf"] }],
          });
        }

        if (outputPath) {
          if (tauriRuntime) {
            await generateNativePdfInHiddenWindow(fileId, outputPath);
          } else {
            const { pdfBytes } = await preparePdf(fileId);
            await writePdfFile(outputPath, pdfBytes);
          }
          if (tauriRuntime) {
            setExportNotice(`Exportacao concluida com sucesso. Salvo em ${outputPath}`);
            setTimeout(() => setExportNotice(""), 3500);
          }
          return;
        }

        const { pdfBytes } = await preparePdf(fileId);
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${defaultName}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Erro ao gerar PDF do historico:", err);
        alert(
          "Erro ao gerar PDF: " +
            (err instanceof Error ? err.message : String(err)),
        );
      } finally {
        setRenderDocument(null);
        setExporting(false);
      }
    },
    [downloadDir, exporting, getDefaultName, preparePdf],
  );

  const printRecentPdf = useCallback(
    async (fileId: string) => {
      if (printing) return;

      setPrinting(true);

      try {
        if (isTauriRuntime()) {
          const { invoke } = await import("@tauri-apps/api/core");
          const { tempDir } = await import("@tauri-apps/api/path");
          const defaultName = await getDefaultName(fileId);
          const tempPath = await tempDir();
          const tmpPath = joinPath(tempPath, `_temp_print_${defaultName}.pdf`);

          await generateNativePdfInHiddenWindow(fileId, tmpPath);

          try {
            await invoke("print_pdf_file", { path: tmpPath });
          } catch {
            try {
              await invoke("print_file", { path: tmpPath });
            } catch {
              alert(`PDF gerado em: ${tmpPath}. Abra o arquivo manualmente para imprimir.`);
            }
          }
          return;
        }

        const { pdfBytes } = await preparePdf(fileId);
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url, "_blank");
        if (!printWindow) {
          URL.revokeObjectURL(url);
          throw new Error("Popup bloqueado. Permita popups para este site.");
        }
        setTimeout(() => URL.revokeObjectURL(url), 120000);
      } catch (err) {
        console.error("Erro ao imprimir PDF do historico:", err);
        alert(
          "Erro ao imprimir: " +
            (err instanceof Error ? err.message : String(err)),
        );
      } finally {
        setRenderDocument(null);
        setPrinting(false);
      }
    },
    [getDefaultName, preparePdf, printing],
  );

  return {
    exportRecentPdf,
    printRecentPdf,
    exporting,
    printing,
    exportNotice,
    renderDocument,
    renderSurfaceId: RENDER_SURFACE_ID,
  };
}
