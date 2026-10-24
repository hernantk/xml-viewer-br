import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import appLogo from "@/assets/branding/app-logo.svg";
import {
  RELAUNCH_DELAY_S,
  type UpdateInfo,
  type UpdaterStatus,
} from "@/hooks/useUpdater";
import { formatBytes } from "@/utils/formatBytes";
import { isTauriRuntime } from "@/utils/runtime";

interface UpdaterModalProps {
  /** Splash de abertura enquanto verifica atualização. */
  showSplash: boolean;
  /** Atualização pendente: a tela bloqueia o app até atualizar. */
  blocking: boolean;
  status: UpdaterStatus;
  updateInfo: UpdateInfo | null;
  downloadProgress: number;
  downloadedBytes: number;
  totalBytes: number;
  errorMessage: string | null;
  onDownload: () => void;
  onRelaunch: () => void;
  onContinueWithoutUpdate: () => void;
}

const FADE_OUT_MS = 450;

export function UpdaterModal(props: UpdaterModalProps) {
  const visible = props.showSplash || props.blocking;
  const [mounted, setMounted] = useState(visible);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setLeaving(false);
      return;
    }
    setLeaving(true);
    const timer = setTimeout(() => setMounted(false), FADE_OUT_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!mounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={props.showSplash ? "Iniciando XML Viewer BR" : "Atualização do XML Viewer BR"}
      className={`fixed inset-0 z-100 flex flex-col items-center overflow-y-auto overflow-x-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 no-print transition-opacity ease-out ${
        leaving ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ transitionDuration: `${FADE_OUT_MS}ms` }}
    >
      <Backdrop />

      <div className="relative my-auto w-full max-w-md px-6 py-10 flex flex-col items-center">
        <Logo compact={!props.showSplash} />

        {props.showSplash ? <SplashStatus /> : <UpdatePanel {...props} />}
      </div>

      <Footer />
    </div>
  );
}

function Backdrop() {
  return (
    <div className="fixed inset-0 pointer-events-none" aria-hidden>
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full bg-emerald-400/25 dark:bg-emerald-500/15 blur-3xl" />
      <div className="absolute -bottom-48 -right-24 h-[420px] w-[420px] rounded-full bg-teal-300/25 dark:bg-teal-500/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-32 h-[360px] w-[360px] rounded-full bg-amber-200/30 dark:bg-amber-500/5 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.45) 1px, transparent 0)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
    </div>
  );
}

function Logo({ compact }: { compact: boolean }) {
  return (
    <div
      className={`flex flex-col items-center transition-all duration-700 ease-out ${
        compact ? "mb-6" : "mb-8"
      }`}
    >
      <div className="relative">
        <div
          className="absolute inset-0 rounded-[28%] bg-emerald-500/50 blur-2xl motion-safe:animate-splash-glow"
          aria-hidden
        />
        <img
          src={appLogo}
          alt=""
          draggable={false}
          className={`relative rounded-[22%] shadow-2xl shadow-emerald-900/30 motion-safe:animate-splash-logo transition-all duration-700 ease-out ${
            compact ? "h-16 w-16" : "h-24 w-24"
          }`}
        />
      </div>
      <h1
        className={`mt-5 font-semibold tracking-tight motion-safe:animate-fade-up transition-all duration-700 ${
          compact ? "text-lg" : "text-2xl"
        }`}
        style={{ animationDelay: "250ms" }}
      >
        XML Viewer <span className="text-emerald-600 dark:text-emerald-400">BR</span>
      </h1>
    </div>
  );
}

function SplashStatus() {
  return (
    <div
      className="flex flex-col items-center gap-3 motion-safe:animate-fade-up"
      style={{ animationDelay: "450ms" }}
    >
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Verificando atualizações…
      </p>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-gray-200/80 dark:bg-gray-800">
        <div className="h-full w-2/5 rounded-full bg-linear-to-r from-emerald-500 to-teal-400 motion-safe:animate-indeterminate" />
      </div>
    </div>
  );
}

function UpdatePanel({
  status,
  updateInfo,
  downloadProgress,
  downloadedBytes,
  totalBytes,
  errorMessage,
  onDownload,
  onRelaunch,
  onContinueWithoutUpdate,
}: UpdaterModalProps) {
  const formattedDate = formatDate(updateInfo?.date);

  return (
    <div className="w-full rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl shadow-2xl shadow-gray-900/10 dark:shadow-black/40 motion-safe:animate-fade-up">
      <div className="px-6 pt-6 pb-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-600/15 dark:ring-emerald-400/20">
          <Sparkles size={12} />
          Nova versão disponível
        </span>

        {updateInfo && (
          <div className="mt-4 flex items-end gap-3">
            {updateInfo.currentVersion && (
              <>
                <span className="pb-1 text-sm font-medium text-gray-400 dark:text-gray-500 tabular-nums">
                  v{updateInfo.currentVersion}
                </span>
                <ArrowRight size={16} className="mb-1.5 text-gray-300 dark:text-gray-600" />
              </>
            )}
            <span className="text-4xl font-bold tracking-tight tabular-nums bg-linear-to-br from-emerald-600 to-teal-500 dark:from-emerald-300 dark:to-teal-400 bg-clip-text text-transparent">
              v{updateInfo.version}
            </span>
          </div>
        )}
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {formattedDate ? `Lançada em ${formattedDate} · ` : ""}
          O app será reiniciado automaticamente ao final.
        </p>
      </div>

      <div className="rounded-b-2xl border-t border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/2 px-6 py-5">
        {(status === "available" || status === "downloading") && (
          <DownloadProgress
            progress={downloadProgress}
            downloadedBytes={downloadedBytes}
            totalBytes={totalBytes}
          />
        )}
        {status === "ready" && <ReadyActions onRelaunch={onRelaunch} />}
        {status === "error" && (
          <ErrorActions
            message={errorMessage}
            onRetry={onDownload}
            onContinue={onContinueWithoutUpdate}
          />
        )}
      </div>
    </div>
  );
}

const primaryButton =
  "group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-600/40 active:scale-[0.99] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900";

function DownloadProgress({
  progress,
  downloadedBytes,
  totalBytes,
}: {
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
}) {
  const known = totalBytes > 0;
  return (
    <div aria-live="polite">
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          <RefreshCw size={14} className="text-emerald-600 dark:text-emerald-400 motion-safe:animate-spin" />
          Baixando atualização…
        </span>
        {known && (
          <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
            {progress}%
          </span>
        )}
      </div>
      <div
        className="relative h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={known ? progress : undefined}
      >
        {known ? (
          <div
            className="relative h-full overflow-hidden rounded-full bg-linear-to-r from-emerald-500 to-teal-400 transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent motion-safe:animate-shimmer" />
          </div>
        ) : (
          <div className="h-full w-2/5 rounded-full bg-linear-to-r from-emerald-500 to-teal-400 motion-safe:animate-indeterminate" />
        )}
      </div>
      <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400 tabular-nums">
        <span>
          {known
            ? `${formatBytes(downloadedBytes)} de ${formatBytes(totalBytes)}`
            : downloadedBytes > 0
              ? formatBytes(downloadedBytes)
              : "Conectando…"}
        </span>
        <span>Não feche o aplicativo</span>
      </div>
    </div>
  );
}

function ReadyActions({ onRelaunch }: { onRelaunch: () => void }) {
  const [seconds, setSeconds] = useState(RELAUNCH_DELAY_S);
  const ref = useAutoFocus<HTMLButtonElement>();
  const relaunchRef = useRef(onRelaunch);
  relaunchRef.current = onRelaunch;

  useEffect(() => {
    if (seconds <= 0) {
      relaunchRef.current();
      return;
    }
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
          <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-semibold">Atualização instalada</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums" aria-live="polite">
            {seconds > 0 ? `Reiniciando em ${seconds}s…` : "Reiniciando…"}
          </p>
        </div>
      </div>
      <button ref={ref} onClick={onRelaunch} className={primaryButton}>
        <RotateCcw size={16} />
        Reiniciar agora
      </button>
    </>
  );
}

function ErrorActions({
  message,
  onRetry,
  onContinue,
}: {
  message: string | null;
  onRetry: () => void;
  onContinue: () => void;
}) {
  const ref = useAutoFocus<HTMLButtonElement>();
  return (
    <>
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-3.5 py-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            Não foi possível baixar a atualização
          </p>
          <p className="mt-0.5 wrap-break-word text-xs text-red-700/90 dark:text-red-300/80">
            {message ?? "Erro desconhecido."} Verifique sua conexão com a internet e tente de novo.
          </p>
        </div>
      </div>
      <button ref={ref} onClick={onRetry} className={primaryButton}>
        <RefreshCw size={16} />
        Tentar novamente
      </button>
      <button
        onClick={onContinue}
        className="mt-2 w-full rounded-lg px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/5 transition"
      >
        Continuar sem atualizar por enquanto
      </button>
    </>
  );
}

function Footer() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    void import("@tauri-apps/api/app")
      .then(({ getVersion }) => getVersion())
      .then(setVersion)
      .catch(() => undefined);
  }, []);

  return (
    <p className="relative shrink-0 pb-5 text-center text-[11px] text-gray-400 dark:text-gray-600">
      Visualizador de NF-e, CT-e e NFS-e{version ? ` · v${version}` : ""}
    </p>
  );
}

function useAutoFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return ref;
}

function formatDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString("pt-BR");
}
