import { useCallback } from "react";
import { createMemoryFileId, useDocumentStore } from "@/store/documentStore";

export function useFileOpen() {
  const loadFile = useDocumentStore((s) => s.loadFile);

  const openFile = useCallback(async () => {
    try {
      // Try to use Tauri dialog
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [{ name: "XML", extensions: ["xml"] }],
      });

      if (selected) {
        const { readTextFile } = await import("@tauri-apps/plugin-fs");
        const content = await readTextFile(selected as string);
        loadFile(selected as string, content);
      }
    } catch {
      // Fallback for browser: use file input
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".xml";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const text = await file.text();
          loadFile(createMemoryFileId(file.name), text);
        }
      };
      input.click();
    }
  }, [loadFile]);

  return { openFile };
}
