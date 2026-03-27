import { useState, type ReactNode, useCallback, useEffect } from "react";
import { Upload } from "lucide-react";
import { useDocumentStore } from "@/store/documentStore";

interface FileDropZoneProps {
  children: ReactNode;
}

export function FileDropZone({ children }: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const loadFile = useDocumentStore((s) => s.loadFile);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name.endsWith(".xml")) {
          const text = await file.text();
          loadFile(file.name, text);
        }
      }
    },
    [loadFile],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  useEffect(() => {
    window.addEventListener("drop", handleDrop);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    return () => {
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
    };
  }, [handleDrop, handleDragOver, handleDragLeave]);

  return (
    <div className="relative">
      {children}
      {dragging && (
        <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-dashed border-blue-500 rounded-lg">
          <div className="flex flex-col items-center text-blue-600 dark:text-blue-400">
            <Upload size={48} />
            <p className="mt-2 text-lg font-medium">Solte o arquivo XML aqui</p>
          </div>
        </div>
      )}
    </div>
  );
}
