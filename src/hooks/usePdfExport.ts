import { useState, useCallback } from "react";
import { useDocumentStore } from "@/store/documentStore";

export function usePdfExport() {
  const [exporting, setExporting] = useState(false);
  const currentXml = useDocumentStore((s) => s.currentXml);

  const exportPdf = useCallback(async () => {
    if (!currentXml) return;

    setExporting(true);
    try {
      // Try Tauri PDF generation
      const { invoke } = await import("@tauri-apps/api/core");
      const { save } = await import("@tauri-apps/plugin-dialog");

      const outputPath = await save({
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });

      if (outputPath) {
        await invoke("generate_pdf", { xml: currentXml, outputPath });
      }
    } catch {
      // Fallback: use window.print()
      window.print();
    } finally {
      setExporting(false);
    }
  }, [currentXml]);

  return { exportPdf, exporting };
}
