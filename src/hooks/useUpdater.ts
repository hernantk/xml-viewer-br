import { useCallback, useEffect, useRef, useState } from "react";
import { isTauriRuntime } from "@/utils/runtime";

export interface UpdateInfo {
  version: string;
  currentVersion: string | null;
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
  downloadedBytes: number;
  totalBytes: number;
  errorMessage: string | null;
  /** Usuário escolheu seguir sem atualizar após um erro de download. */
  deferred: boolean;
}

type DownloadEvent = {
  event: string;
  data?: { contentLength?: number; chunkLength?: number };
};

type PendingUpdate = {
  version: string;
  currentVersion?: string;
  date?: string;
  body?: string;
  downloadAndInstall: (cb: (event: DownloadEvent) => void) => Promise<void>;
};

/** Tempo mínimo da splash, para a animação do logo não "piscar". */
const SPLASH_MIN_MS = 1400;
/** Se a verificação demorar mais que isso, libera o app e segue checando em segundo plano. */
const CHECK_TIMEOUT_MS = 8000;
/** Contagem regressiva até reiniciar sozinho depois de instalar. */
export const RELAUNCH_DELAY_S = 5;

type PreviewMode = "available" | "error" | "uptodate";

/**
 * Em dev, `?updater=available|error|uptodate` simula o fluxo de atualização
 * no navegador para conferir a tela sem publicar um release.
 */
function getPreviewMode(): PreviewMode | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const mode = new URLSearchParams(window.location.search).get("updater");
  return mode === "available" || mode === "error" || mode === "uptodate"
    ? mode
    : null;
}

function createPreviewUpdate(mode: PreviewMode): PendingUpdate {
  return {
    version: "1.7.0",
    currentVersion: "1.6.6",
    date: new Date().toISOString(),
    downloadAndInstall: (cb) =>
      new Promise((resolve, reject) => {
        const total = 38_400_000;
        let received = 0;
        cb({ event: "Started", data: { contentLength: total } });
        const timer = setInterval(() => {
          const chunk = 1_100_000;
          received += chunk;
          if (mode === "error" && received > total * 0.55) {
            clearInterval(timer);
            reject(new Error("Falha de rede: a conexão foi interrompida."));
            return;
          }
          cb({ event: "Progress", data: { chunkLength: chunk } });
          if (received >= total) {
            clearInterval(timer);
            cb({ event: "Finished" });
            resolve();
          }
        }, 120);
      }),
  };
}

export function useUpdater() {
  const previewMode = useRef(getPreviewMode()).current;
  // Dev builds never install a real release over themselves; use ?updater= to preview.
  const enabled = previewMode !== null || (isTauriRuntime() && !import.meta.env.DEV);

  const [state, setState] = useState<UpdaterState>({
    status: "idle",
    updateInfo: null,
    downloadProgress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    errorMessage: null,
    deferred: false,
  });
  const [splashMinElapsed, setSplashMinElapsed] = useState(false);
  const [checkTimedOut, setCheckTimedOut] = useState(false);

  const pendingUpdate = useRef<PendingUpdate | null>(null);
  const checkStarted = useRef(false);

  const downloadAndInstall = useCallback(async () => {
    const update = pendingUpdate.current;
    if (!update) return;

    setState((s) => ({
      ...s,
      status: "downloading",
      downloadProgress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      errorMessage: null,
      deferred: false,
    }));

    let totalLength = 0;
    let received = 0;

    try {
      await update.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === "Started") {
          totalLength = event.data?.contentLength ?? 0;
          setState((s) => ({ ...s, totalBytes: totalLength }));
        } else if (event.event === "Progress") {
          received += event.data?.chunkLength ?? 0;
          const pct =
            totalLength > 0
              ? Math.min(100, Math.round((received / totalLength) * 100))
              : 0;
          setState((s) => ({ ...s, downloadProgress: pct, downloadedBytes: received }));
        } else if (event.event === "Finished") {
          setState((s) => ({ ...s, status: "ready", downloadProgress: 100 }));
        }
      });
      setState((s) => (s.status === "downloading" ? { ...s, status: "ready", downloadProgress: 100 } : s));
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

  const checkForUpdates = useCallback(async () => {
    if (!enabled) return;

    setState((s) => ({ ...s, status: "checking", errorMessage: null }));

    try {
      let update: PendingUpdate | null;
      if (previewMode) {
        await new Promise((r) => setTimeout(r, 1200));
        update = previewMode === "uptodate" ? null : createPreviewUpdate(previewMode);
      } else {
        const { check } = await import("@tauri-apps/plugin-updater");
        update = (await check()) as PendingUpdate | null;
      }

      if (!update) {
        setState((s) => ({ ...s, status: "up-to-date" }));
        return;
      }

      pendingUpdate.current = update;
      setState({
        status: "downloading",
        downloadProgress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        errorMessage: null,
        deferred: false,
        updateInfo: {
          version: update.version,
          currentVersion: update.currentVersion ?? null,
          date: update.date ?? null,
          body: update.body ?? null,
        },
      });
      // Atualização é obrigatória: baixa e instala sem esperar clique.
      void downloadAndInstall();
    } catch (err) {
      // Falha ao verificar (offline, GitHub fora) não bloqueia o app.
      setState((s) => ({
        ...s,
        status: "error",
        updateInfo: null,
        errorMessage:
          err instanceof Error ? err.message : "Erro ao verificar atualização",
      }));
    }
  }, [enabled, previewMode, downloadAndInstall]);

  const relaunch = useCallback(async () => {
    if (previewMode) {
      window.location.search = "";
      return;
    }
    if (!isTauriRuntime()) return;
    const { relaunch: tauriRelaunch } = await import(
      "@tauri-apps/plugin-process"
    );
    await tauriRelaunch();
  }, [previewMode]);

  /** Saída disponível só após erro de download: libera o app e mantém o aviso no header. */
  const continueWithoutUpdate = useCallback(() => {
    setState((s) => ({
      ...s,
      status: pendingUpdate.current ? "available" : "idle",
      errorMessage: null,
      deferred: true,
    }));
  }, []);

  /** Botão do header após adiar: volta para a tela e retoma o download. */
  const openModal = useCallback(() => {
    if (state.status === "ready") {
      setState((s) => ({ ...s, deferred: false }));
      return;
    }
    void downloadAndInstall();
  }, [state.status, downloadAndInstall]);

  // Verifica logo na abertura, enquanto a splash está na tela
  useEffect(() => {
    if (!enabled || checkStarted.current) return;
    checkStarted.current = true;
    void checkForUpdates();
  }, [enabled, checkForUpdates]);

  useEffect(() => {
    if (!enabled) return;
    const minTimer = setTimeout(() => setSplashMinElapsed(true), SPLASH_MIN_MS);
    const timeoutTimer = setTimeout(() => setCheckTimedOut(true), CHECK_TIMEOUT_MS);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(timeoutTimer);
    };
  }, [enabled]);

  const checkSettled = state.status !== "idle" && state.status !== "checking";
  const hasPendingUpdate = pendingUpdate.current !== null;
  const showSplash = enabled && !(splashMinElapsed && (checkSettled || checkTimedOut));
  // Erro de verificação (sem update pendente) não bloqueia; erro de download sim.
  const blocking =
    !state.deferred &&
    (state.status === "available" ||
      state.status === "downloading" ||
      state.status === "ready" ||
      (state.status === "error" && hasPendingUpdate));

  return {
    ...state,
    showSplash,
    blocking,
    checkForUpdates,
    downloadAndInstall,
    relaunch,
    continueWithoutUpdate,
    openModal,
  };
}
