import {
  useState,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { Upload } from "lucide-react";
import { createMemoryFileId, useDocumentStore } from "@/store/documentStore";

interface FileDropZoneProps {
  children: ReactNode;
}

export function FileDropZone({ children }: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const loadFile = useDocumentStore((s) => s.loadFile);
  const loadMultipleFiles = useDocumentStore((s) => s.loadMultipleFiles);
  const setError = useDocumentStore((s) => s.setError);
  const dragDepthRef = useRef(0);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const isXmlFile = useCallback((fileName: string) => {
    return fileName.toLowerCase().endsWith(".xml");
  }, []);

  const readFileFromPath = useCallback(
    async (filePaths: string[]) => {
      const xmlPaths = filePaths.filter((p) => isXmlFile(p));
      if (xmlPaths.length === 0) {
        setError("Solte arquivos com extensão .xml.");
        return;
      }

      try {
        const { readTextFile } = await import("@tauri-apps/plugin-fs");

        if (xmlPaths.length === 1) {
          const content = await readTextFile(xmlPaths[0]);
          loadFile(xmlPaths[0], content);
          return;
        }

        const files: { id: string; content: string }[] = [];
        for (const p of xmlPaths) {
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
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Não foi possível ler o(s) arquivo(s) arrastado(s).",
        );
      }
    },
    [isXmlFile, loadFile, loadMultipleFiles, setError],
  );

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      dragDepthRef.current = 0;
      setDragging(false);

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const xmlFiles = Array.from(files).filter((f) => isXmlFile(f.name));
      if (xmlFiles.length === 0) {
        setError("Solte arquivos com extensão .xml.");
        return;
      }

      try {
        if (xmlFiles.length === 1) {
          const text = await xmlFiles[0].text();
          loadFile(createMemoryFileId(xmlFiles[0].name), text);
          return;
        }

        const parsed: { id: string; content: string }[] = [];
        for (const f of xmlFiles) {
          try {
            const text = await f.text();
            parsed.push({ id: createMemoryFileId(f.name), content: text });
          } catch {
            /* skip unreadable */
          }
        }
        const result = await loadMultipleFiles(parsed);
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
        setError(
          error instanceof Error
            ? error.message
            : "Não foi possível ler o(s) arquivo(s) arrastado(s).",
        );
      }
    },
    [isXmlFile, loadFile, loadMultipleFiles, setError],
  );

  const handleDragEnter = useCallback((e: DragEvent) => {
    if (!e.dataTransfer?.types.includes("Files")) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setDragging(true);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    if (!e.dataTransfer?.types.includes("Files")) return;
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setDragging(false);
    }
  }, []);

  useEffect(() => {
    let unlistenTauriDrop: (() => void) | undefined;

    const setupTauriDrop = async () => {
      if (!("__TAURI_INTERNALS__" in window)) return;

      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      unlistenTauriDrop = await getCurrentWindow().onDragDropEvent(
        async (event) => {
          if (
            event.payload.type === "enter" ||
            event.payload.type === "over"
          ) {
            setDragging(true);
            return;
          }

          if (event.payload.type === "leave") {
            setDragging(false);
            return;
          }

          setDragging(false);
          const paths = event.payload.paths;
          if (paths && paths.length > 0) {
            await readFileFromPath(paths);
          }
        },
      );
    };

    void setupTauriDrop();

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("drop", handleDrop);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);

    return () => {
      if (unlistenTauriDrop) {
        unlistenTauriDrop();
      }
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop, readFileFromPath]);

  return (
    <div className="relative">
      {children}
      {dragging && (
        <div className="pointer-events-none fixed inset-0 bg-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-dashed border-blue-500">
          <div className="flex flex-col items-center text-blue-600 dark:text-blue-400">
            <Upload size={48} />
            <p className="mt-2 text-lg font-medium">Solte os arquivos XML aqui</p>
          </div>
        </div>
      )}
      {importNotice && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {importNotice}
        </div>
      )}
    </div>
  );
}
