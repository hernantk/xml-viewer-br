import { useCallback, useEffect, useRef, useState } from "react";
import { isTauriRuntime } from "@/utils/runtime";

export interface UpdateInfo {
  version: string;
  date: string | null;
  body: string | null;
}

export type UpdaterStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "error"
  | "up-to-date";

interface UpdaterState {
  status: UpdaterStatus;
  updateInfo: UpdateInfo | null;
  downloadProgress: number;
  errorMessage: string | null;
  modalVisible: boolean;
}

type DownloadEvent = {
  event: string;
  data?: { contentLength?: number; chunkLength?: number };
};

type PendingUpdate = {
  version: string;
  date?: string;
  body?: string;
  downloadAndInstall: (cb: (event: DownloadEvent) => void) => Promise<void>;
};

export function useUpdater() {
  const [state, setState] = useState<UpdaterState>({
    status: "idle",
    updateInfo: null,
    downloadProgress: 0,
    errorMessage: null,
    modalVisible: false,
  });

  const pendingUpdate = useRef<PendingUpdate | null>(null);

  const checkForUpdates = useCallback(async () => {
    if (!isTauriRuntime()) return;

    setState((s) => ({ ...s, status: "checking", errorMessage: null }));

    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();

      if (!update) {
        setState((s) => ({ ...s, status: "up-to-date" }));
        return;
      }

      pendingUpdate.current = update as PendingUpdate;
      setState({
        status: "available",
        downloadProgress: 0,
        errorMessage: null,
        modalVisible: false,
        updateInfo: {
          version: update.version,
          date: update.date ?? null,
          body: update.body ?? null,
        },
      });
    } catch (err) {
      setState({
        status: "error",
        updateInfo: null,
        downloadProgress: 0,
        errorMessage:
          err instanceof Error ? err.message : "Erro ao verificar atualização",
        modalVisible: false,
      });
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    const update = pendingUpdate.current;
    if (!update) return;

    setState((s) => ({ ...s, status: "downloading", downloadProgress: 0 }));

    let totalLength = 0;
    let received = 0;

    try {
      await update.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === "Started") {
          totalLength = event.data?.contentLength ?? 0;
        } else if (event.event === "Progress") {
          received += event.data?.chunkLength ?? 0;
          const pct =
            totalLength > 0
              ? Math.min(100, Math.round((received / totalLength) * 100))
              : 0;
          setState((s) => ({ ...s, downloadProgress: pct }));
        } else if (event.event === "Finished") {
          setState((s) => ({ ...s, status: "ready", downloadProgress: 100 }));
        }
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        status: "error",
        downloadProgress: 0,
        errorMessage:
          err instanceof Error ? err.message : "Erro ao baixar atualização",
      }));
    }
  }, []);

  const relaunch = useCallback(async () => {
    if (!isTauriRuntime()) return;
    const { relaunch: tauriRelaunch } = await import(
      "@tauri-apps/plugin-process"
    );
    await tauriRelaunch();
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => {
      // Se update disponível ou pronto para instalar: só fecha o modal, mantém o botão no header
      if (prev.status === "available" || prev.status === "ready") {
        return { ...prev, modalVisible: false };
      }
      // Para erro ou outros estados: reseta tudo
      pendingUpdate.current = null;
      return {
        status: "idle",
        updateInfo: null,
        downloadProgress: 0,
        errorMessage: null,
        modalVisible: false,
      };
    });
  }, []);

  const openModal = useCallback(() => {
    setState((s) => ({ ...s, modalVisible: true }));
  }, []);

  // Verifica update 3s após mount — não bloqueia o render inicial
  useEffect(() => {
    const timer = setTimeout(() => void checkForUpdates(), 3000);
    return () => clearTimeout(timer);
  }, [checkForUpdates]);

  return { ...state, checkForUpdates, downloadAndInstall, relaunch, dismiss, openModal };
}
