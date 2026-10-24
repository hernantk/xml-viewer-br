import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Building2, FileClock, FolderOpen, Landmark, Settings2, Trash2, X } from "lucide-react";
import { useDocumentStore } from "@/store/documentStore";

interface SettingsModalProps { open: boolean; onClose: () => void }
interface ToggleProps {
  checked: boolean; description: string; icon: ReactNode; label: string;
  onChange: (checked: boolean) => void;
}

function SettingToggle({ checked, description, icon, label, onChange }: ToggleProps) {
  return (
    <label className="group flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-3.5 transition hover:border-blue-200 hover:bg-blue-50/40 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/20">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-700 dark:bg-gray-800 dark:text-gray-300 dark:group-hover:bg-blue-900/50 dark:group-hover:text-blue-300">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-gray-500 dark:text-gray-400">{description}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span className="relative mt-1 h-5 w-9 shrink-0 rounded-full bg-gray-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-blue-600 peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 dark:bg-gray-600 dark:peer-focus-visible:ring-offset-gray-900" />
    </label>
  );
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const maxRecentFiles = useDocumentStore((s) => s.maxRecentFiles);
  const recentFilesCount = useDocumentStore((s) => s.recentFiles.length);
  const clearRecentFiles = useDocumentStore((s) => s.clearRecentFiles);
  const setMaxRecentFiles = useDocumentStore((s) => s.setMaxRecentFiles);
  const downloadDir = useDocumentStore((s) => s.downloadDir);
  const setDownloadDir = useDocumentStore((s) => s.setDownloadDir);
  const groupByEmitente = useDocumentStore((s) => s.groupByEmitente);
  const setGroupByEmitente = useDocumentStore((s) => s.setGroupByEmitente);
  const showIbsCbs = useDocumentStore((s) => s.showIbsCbs);
  const setShowIbsCbs = useDocumentStore((s) => s.setShowIbsCbs);
  const [inputValue, setInputValue] = useState(String(maxRecentFiles));
  const [downloadDirValue, setDownloadDirValue] = useState(downloadDir);
  const [groupValue, setGroupValue] = useState(groupByEmitente);
  const [taxesValue, setTaxesValue] = useState(showIbsCbs);
  const [showWarning, setShowWarning] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setInputValue(String(maxRecentFiles));
    setDownloadDirValue(downloadDir);
    setGroupValue(groupByEmitente);
    setTaxesValue(showIbsCbs);
    setShowWarning(false);
    setConfirmClearHistory(false);
    requestAnimationFrame(() => dialogRef.current?.focus());
    if (!downloadDir) void (async () => {
      try {
        const { downloadDir: getDownloadDir } = await import("@tauri-apps/api/path");
        const dir = await getDownloadDir();
        if (dir) setDownloadDirValue(dir);
      } catch { /* browser */ }
    })();
  }, [open, maxRecentFiles, downloadDir, groupByEmitente, showIbsCbs]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;
  const numericValue = Number(inputValue);
  const isValid = Number.isInteger(numericValue) && numericValue >= 1;
  const willRemoveFiles = isValid && numericValue < recentFilesCount;
  const filesToRemove = willRemoveFiles ? recentFilesCount - numericValue : 0;

  const handleSave = () => {
    if (!isValid) return;
    if (willRemoveFiles && !showWarning) { setShowWarning(true); return; }
    setMaxRecentFiles(numericValue);
    setDownloadDir(downloadDirValue.trim());
    setGroupByEmitente(groupValue);
    setShowIbsCbs(taxesValue);
    onClose();
  };

  const handlePickFolder = async () => {
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const selected = await openDialog({ directory: true, multiple: false });
      if (selected) setDownloadDirValue(selected as string);
    } catch { /* browser */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="settings-title" tabIndex={-1} data-block-global-shortcuts className="flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-2xl outline-none dark:border-gray-700 dark:bg-gray-950">
        <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300"><Settings2 size={20} /></span>
          <div className="min-w-0 flex-1">
            <h2 id="settings-title" className="text-base font-semibold text-gray-950 dark:text-white">Configurações</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Personalize a organização, exibição e armazenamento das notas.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar configurações" className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-gray-800 dark:hover:text-white"><X size={18} /></button>
        </header>

        <div className="space-y-5 overflow-y-auto p-5">
          <section aria-labelledby="display-settings-title">
            <h3 id="display-settings-title" className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Exibição</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <SettingToggle checked={groupValue} onChange={setGroupValue} icon={<Building2 size={17} />} label="Agrupar por emitente" description="Organiza as notas por empresa na barra lateral." />
              <SettingToggle checked={taxesValue} onChange={setTaxesValue} icon={<Landmark size={17} />} label="Exibir IBS / CBS" description="Mostra os tributos da Reforma Tributária no DANFE." />
            </div>
          </section>

          <section aria-labelledby="history-settings-title">
            <h3 id="history-settings-title" className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Histórico</h3>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"><FileClock size={17} /></span>
                <div className="min-w-0 flex-1">
                  <label htmlFor="maxRecentFiles" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Máximo de notas recentes</label>
                  <p className="mt-0.5 text-xs leading-5 text-gray-500 dark:text-gray-400">Atualmente há {recentFilesCount} {recentFilesCount === 1 ? "nota" : "notas"} no histórico.</p>
                  <div className="mt-3 flex items-center gap-2">
                    <input id="maxRecentFiles" type="number" min={1} step={1} value={inputValue} onChange={(e) => { setInputValue(e.target.value); setShowWarning(false); }} onKeyDown={(e) => e.key === "Enter" && handleSave()} aria-invalid={!isValid} className="w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                    <span className="text-xs text-gray-400">Padrão: 300</span>
                  </div>
                  {!isValid && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">Informe um número inteiro maior ou igual a 1.</p>}
                  {showWarning && willRemoveFiles && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      <p className="text-xs leading-5">As {filesToRemove} {filesToRemove === 1 ? "nota mais antiga será removida" : "notas mais antigas serão removidas"}. Clique em confirmar para continuar.</p>
                    </div>
                  )}
                  <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                    {!confirmClearHistory ? (
                      <button
                        type="button"
                        onClick={() => setConfirmClearHistory(true)}
                        disabled={recentFilesCount === 0}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <Trash2 size={15} />
                        Limpar histórico
                      </button>
                    ) : (
                      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
                        <p className="text-xs leading-5 text-red-800 dark:text-red-200">
                          Remover permanentemente {recentFilesCount === 1 ? "esta nota" : `as ${recentFilesCount} notas`} do histórico? A nota aberta continuará na tela.
                        </p>
                        <div className="mt-2 flex justify-end gap-2">
                          <button type="button" onClick={() => setConfirmClearHistory(false)} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800">
                            Manter histórico
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              clearRecentFiles();
                              setConfirmClearHistory(false);
                            }}
                            className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                          >
                            Sim, limpar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="download-settings-title">
            <h3 id="download-settings-title" className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Arquivos</h3>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <label htmlFor="downloadDir" className="text-sm font-medium text-gray-900 dark:text-gray-100">Pasta padrão de downloads</label>
              <p className="mt-0.5 text-xs leading-5 text-gray-500 dark:text-gray-400">Local usado para salvar XMLs e PDFs exportados.</p>
              <div className="mt-3 flex gap-2">
                <input id="downloadDir" type="text" value={downloadDirValue} onChange={(e) => setDownloadDirValue(e.target.value)} placeholder="Pasta de Downloads do sistema" className="min-w-0 flex-1 truncate rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                <button type="button" onClick={handlePickFolder} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"><FolderOpen size={16} /><span className="hidden sm:inline">Escolher</span></button>
              </div>
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-gray-200 bg-white px-5 py-3.5 dark:border-gray-800 dark:bg-gray-900">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white">Cancelar</button>
          <button type="button" onClick={handleSave} disabled={!isValid} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-gray-900 ${showWarning ? "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500" : "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500"}`}>{showWarning ? "Confirmar alteração" : "Salvar alterações"}</button>
        </footer>
      </div>
    </div>
  );
}
