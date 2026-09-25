import { useCallback, useState } from "react";
import { createMemoryFileId, useDocumentStore } from "@/store/documentStore";

export function useFileOpen() {
  const loadFile = useDocumentStore((s) => s.loadFile);
  const loadMultipleFiles = useDocumentStore((s) => s.loadMultipleFiles);
  const loadPaths = useDocumentStore((s) => s.loadPaths);
  const setLoading = useDocumentStore((s) => s.setLoading);
  const setError = useDocumentStore((s) => s.setError);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const openFile = useCallback(async () => {
    let selected: string | string[] | null;
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      selected = await open({
        multiple: true,
        filters: [{ name: "XML", extensions: ["xml"] }],
      });
    } catch {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".xml";
      input.multiple = true;
      input.onchange = async (e) => {
        const fileList = (e.target as HTMLInputElement).files;
        if (!fileList || fileList.length === 0) return;

        setLoading(true);

        try {
          if (fileList.length === 1) {
            const text = await fileList[0].text();
            await loadFile(createMemoryFileId(fileList[0].name), text);
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
        } catch (error) {
          setLoading(false);
          setError(
            error instanceof Error
              ? error.message
              : "Não foi possível importar o(s) arquivo(s).",
          );
        }
      };
      input.click();
      return;
    }

    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    if (paths.length === 0) return;

    try {
      const result = await loadPaths(paths);
      if (result.limitIncreased) {
        setImportNotice(
          `${result.loaded} arquivo(s) importado(s). Limite aumentado para ${result.newLimit}.`,
        );
        setTimeout(() => setImportNotice(null), 5000);
      } else if (result.loaded > 1) {
        setImportNotice(`${result.loaded} arquivo(s) importado(s).`);
        setTimeout(() => setImportNotice(null), 4000);
      }
    } catch (error) {
      setLoading(false);
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível importar o(s) arquivo(s).",
      );
    }
  }, [loadFile, loadMultipleFiles, loadPaths, setError, setLoading]);

  return { openFile, importNotice };
}
