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
  const setError = useDocumentStore((s) => s.setError);
  const dragDepthRef = useRef(0);

  const isXmlFile = useCallback((fileName: string) => {
    return fileName.toLowerCase().endsWith(".xml");
  }, []);

  const readFileFromPath = useCallback(
    async (filePath: string) => {
      if (!isXmlFile(filePath)) {
        setError("Solte um arquivo com extensao .xml.");
        return;
      }

      try {
        const { readTextFile } = await import("@tauri-apps/plugin-fs");
        const content = await readTextFile(filePath);
        loadFile(filePath, content);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Nao foi possivel ler o arquivo arrastado.",
        );
      }
    },
    [isXmlFile, loadFile, setError],
  );

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      dragDepthRef.current = 0;
      setDragging(false);

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      if (!isXmlFile(file.name)) {
        setError("Solte um arquivo com extensao .xml.");
        return;
      }

      try {
        const text = await file.text();
        loadFile(createMemoryFileId(file.name), text);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Nao foi possivel ler o arquivo arrastado.",
        );
      }
    },
    [isXmlFile, loadFile, setError],
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
          const [filePath] = event.payload.paths;
          if (filePath) {
            await readFileFromPath(filePath);
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
            <p className="mt-2 text-lg font-medium">Solte o arquivo XML aqui</p>
          </div>
        </div>
      )}
    </div>
  );
}
