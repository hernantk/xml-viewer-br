import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ExternalLink, RefreshCw, ShieldCheck, X } from "lucide-react";
import {
  getCertificateName,
  normalizeAccessKey,
  useXmlDownload,
} from "@/hooks/useXmlDownload";

interface XmlDownloadModalProps {
  open: boolean;
  onClose: () => void;
}

function formatCertificateDate(value: string): string {
  if (!value) return "Data indisponível";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

export function XmlDownloadModal({ open, onClose }: XmlDownloadModalProps) {
  const [accessKey, setAccessKey] = useState("");
  const [selectedCertificate, setSelectedCertificate] = useState("");
  const {
    certificates,
    loadingCertificates,
    opening,
    error,
    loadCertificates,
    closeDownloadWindow,
    openDownloadWindow,
  } = useXmlDownload(open);

  const normalizedAccessKey = normalizeAccessKey(accessKey);
  const canOpen = normalizedAccessKey.length === 44 && !!selectedCertificate && !opening;

  const selectedCertificateDetails = useMemo(
    () => certificates.find((cert) => cert.thumbprint === selectedCertificate),
    [certificates, selectedCertificate],
  );

  useEffect(() => {
    if (!open) return;

    const savedThumbprint = localStorage.getItem("xmlviewer-selected-cert");
    const isValid = savedThumbprint && certificates.some((c) => c.thumbprint === savedThumbprint);

    setSelectedCertificate(isValid ? savedThumbprint : (certificates[0]?.thumbprint || ""));
  }, [certificates, open]);

  if (!open) return null;

  const handleClose = () => {
    void closeDownloadWindow();
    onClose();
  };

  const handleCertificateChange = (thumbprint: string) => {
    setSelectedCertificate(thumbprint);
    localStorage.setItem("xmlviewer-selected-cert", thumbprint);
    void closeDownloadWindow();
  };

  const handleOpen = async () => {
    const opened = await openDownloadWindow(accessKey, selectedCertificate);
    if (opened) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 no-print">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl dark:bg-gray-900 dark:text-gray-100">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold">Baixar XML NF-e</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Abra a consulta oficial da NF-e em uma janela interna.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Chave de acesso</span>
            <input
              value={accessKey}
              onChange={(event) => setAccessKey(event.target.value)}
              placeholder="Digite ou cole a chave de 44 dígitos"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950"
            />
            <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
              {normalizedAccessKey.length}/44 dígitos. A chave ainda deverá ser informada no portal da NF-e.
            </span>
          </label>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Certificado digital</span>
              <button
                type="button"
                onClick={() => void loadCertificates()}
                disabled={loadingCertificates}
                className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
              >
                <RefreshCw size={13} className={loadingCertificates ? "animate-spin" : ""} />
                Atualizar
              </button>
            </div>

            <select
              value={selectedCertificate}
              onChange={(event) => handleCertificateChange(event.target.value)}
              disabled={loadingCertificates || certificates.length === 0}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950"
            >
              {loadingCertificates && <option>Carregando certificados...</option>}
              {!loadingCertificates && certificates.length === 0 && (
                <option>Nenhum certificado válido com chave privada encontrado</option>
              )}
              {certificates.map((certificate) => (
                <option key={certificate.thumbprint} value={certificate.thumbprint}>
                  {getCertificateName(certificate)} - válido até {formatCertificateDate(certificate.notAfter)}
                </option>
              ))}
            </select>

            {selectedCertificateDetails && (
              <div className="mt-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-950 dark:text-gray-300">
                <div className="flex items-center gap-1.5 font-medium text-green-700 dark:text-green-400">
                  <ShieldCheck size={14} />
                  Certificado com chave privada disponível
                </div>
                <div className="mt-1">Emissor: {selectedCertificateDetails.issuer}</div>
                <div>Thumbprint: {selectedCertificateDetails.thumbprint}</div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            O CAPTCHA e o PIN do certificado A3, se solicitados, devem ser feitos manualmente. Se o WebView2 pedir o certificado, escolha o mesmo selecionado aqui.
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleOpen()}
            disabled={!canOpen}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ExternalLink size={16} />
            {opening ? "Abrindo..." : "Abrir consulta"}
          </button>
        </div>
      </div>
    </div>
  );
}
