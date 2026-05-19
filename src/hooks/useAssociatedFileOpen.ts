import { useEffect, useState } from "react";
import { useDocumentStore } from "@/store/documentStore";

interface AssociatedFilesPayload {
  paths?: unknown;
}

interface NfeXmlDownloadedPayload {
  path?: unknown;
}

function isTauriRuntime(): boolean {
  const tauriWindow = window as Window & {
    __TAURI_INTERNALS__?: { invoke?: unknown };
  };

  return (
    typeof window !== "undefined" &&
    typeof tauriWindow.__TAURI_INTERNALS__ === "object" &&
    typeof tauriWindow.__TAURI_INTERNALS__.invoke === "function"
  );
}

function normalizePaths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [...new Set(value.filter((item): item is string => typeof item === "string"))];
}

export function useAssociatedFileOpen() {
  const loadPaths = useDocumentStore((s) => s.loadPaths);
  const [nfeDownloadNotice, setNfeDownloadNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    let unlistenAssociated: (() => void) | undefined;
    let unlistenNfeDownload: (() => void) | undefined;

    const setup = async () => {
      const [{ listen }, { invoke }] = await Promise.all([
        import("@tauri-apps/api/event"),
        import("@tauri-apps/api/core"),
      ]);

      unlistenAssociated = await listen<AssociatedFilesPayload>(
        "app://open-associated-files",
        async (event) => {
          const paths = normalizePaths(event.payload?.paths);
          if (paths.length > 0) {
            await loadPaths(paths);
          }
        },
      );

      unlistenNfeDownload = await listen<NfeXmlDownloadedPayload>(
        "app://nfe-xml-downloaded",
        async (event) => {
          const path = event.payload?.path;
          if (typeof path !== "string" || !path) return;

          await loadPaths([path]);
          setNfeDownloadNotice("XML da NF-e baixado e importado automaticamente.");
          setTimeout(() => setNfeDownloadNotice(null), 5000);
        },
      );

      const pending = await invoke<string[]>("take_pending_open_paths");
      const paths = normalizePaths(pending);
      if (paths.length > 0) {
        await loadPaths(paths);
      }
    };

    void setup();

    return () => {
      if (unlistenAssociated) unlistenAssociated();
      if (unlistenNfeDownload) unlistenNfeDownload();
    };
  }, [loadPaths]);

  return { nfeDownloadNotice };
}
