import { useCallback, useState } from "react";
import { createMemoryFileId, useDocumentStore } from "@/store/documentStore";

export function useFileOpen() {
  const loadFile = useDocumentStore((s) => s.loadFile);
  const loadMultipleFiles = useDocumentStore((s) => s.loadMultipleFiles);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const openFile = useCallback(async () => {
    try {
      // Try to use Tauri dialog
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: true,
        filters: [{ name: "XML", extensions: ["xml"] }],
      });

      if (!selected) return;

      const paths = Array.isArray(selected) ? selected : [selected];
      if (paths.length === 0) return;

      if (paths.length === 1) {
        const { readTextFile } = await import("@tauri-apps/plugin-fs");
        const content = await readTextFile(paths[0]);
        loadFile(paths[0], content);
        return;
      }

      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const files: { id: string; content: string }[] = [];
      for (const p of paths) {
        try {
          const content = await readTextFile(p);
          files.push({ id: p, content });
        } catch {
          /* skip unreadable */
        }
      }
      const result = await loadMultipleFiles(files);
      if (result.limitIncreased) {
        setImportNotice(
          `${result.loaded} arquivo(s) importado(s). Limite aumentado para ${result.newLimit}.`,
        );
        setTimeout(() => setImportNotice(null), 5000);
      } else if (result.loaded > 1) {
        setImportNotice(`${result.loaded} arquivo(s) importado(s).`);
        setTimeout(() => setImportNotice(null), 4000);
      }
    } catch {
      // Fallback for browser: use file input
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".xml";
      input.multiple = true;
      input.onchange = async (e) => {
        const fileList = (e.target as HTMLInputElement).files;
        if (!fileList || fileList.length === 0) return;

        if (fileList.length === 1) {
          const text = await fileList[0].text();
          loadFile(createMemoryFileId(fileList[0].name), text);
          return;
        }

        const files: { id: string; content: string }[] = [];
        for (const f of Array.from(fileList)) {
          try {
            const text = await f.text();
            files.push({ id: createMemoryFileId(f.name), content: text });
          } catch {
            /* skip */
          }
        }
        const result = await loadMultipleFiles(files);
        if (result.limitIncreased) {
          setImportNotice(
            `${result.loaded} arquivo(s) importado(s). Limite aumentado para ${result.newLimit}.`,
          );
          setTimeout(() => setImportNotice(null), 5000);
        } else if (result.loaded > 1) {
          setImportNotice(`${result.loaded} arquivo(s) importado(s).`);
          setTimeout(() => setImportNotice(null), 4000);
        }
      };
      input.click();
    }
  }, [loadFile, loadMultipleFiles]);

  return { openFile, importNotice };
}
