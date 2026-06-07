import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, X, SearchCheck } from "lucide-react";
import { validateChave, formatChaveGrupos, type ChaveValidationResult } from "@/utils/chaveValidator";
import { formatCNPJ } from "@/utils/formatters";
import { useDocumentStore } from "@/store/documentStore";

interface ChaveValidatorModalProps {
  open: boolean;
  onClose: () => void;
}

function extractChaveFromStore(): string {
  const doc = useDocumentStore.getState().currentDocument;
  if (!doc) return "";

  if (doc.documentType === "nfe" && doc.nfe) {
    return doc.nfe.infNFe.id.replace(/^NFe/, "");
  }
  if (doc.documentType === "cte" && doc.cte) {
    return doc.cte.infCte.id.replace(/^CTe/, "");
  }
  if (doc.documentType === "nfse" && doc.nfse) {
    return doc.nfse.nfse.infNfse.codigoVerificacao || "";
  }
  if (doc.documentType === "nfse-sped" && doc.spedNfse) {
    return doc.spedNfse.infNFSe.id.replace(/^NFS/, "");
  }
  return "";
}

export function ChaveValidatorModal({ open, onClose }: ChaveValidatorModalProps) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ChaveValidationResult | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);

  useEffect(() => {
    if (!open) return;

    const chave = extractChaveFromStore();
    if (chave) {
      setInput(chave);
      setResult(validateChave(chave));
      setAutoFilled(true);
    } else {
      setInput("");
      setResult(null);
      setAutoFilled(false);
    }
  }, [open]);

  if (!open) return null;

  const handleValidate = () => {
    setResult(validateChave(input));
    setAutoFilled(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (result) setResult(null);
    setAutoFilled(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleValidate();
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 no-print"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Verificador de Chave NF-e / CT-e
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Valide o dígito verificador e extraia os dados da chave de 44 dígitos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Chave de acesso
            </label>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Cole a chave de 44 dígitos"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
              />
              <button
                type="button"
                onClick={handleValidate}
                disabled={input.trim().length === 0}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SearchCheck size={16} />
                Validar
              </button>
            </div>
            {autoFilled && (
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                Chave preenchida automaticamente a partir do documento aberto.
              </p>
            )}
          </div>

          {result && (
            <div className={`rounded-lg border p-3 ${
              result.valid
                ? "border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30"
                : "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
            }`}>
              <div className="flex items-start gap-2">
                {result.valid ? (
                  <CheckCircle size={18} className="mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500 dark:text-red-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${
                    result.valid
                      ? "text-green-700 dark:text-green-300"
                      : "text-red-700 dark:text-red-300"
                  }`}>
                    {result.valid ? "Chave válida" : result.error}
                  </p>

                  {result.valid && result.chaveLimpa && (
                    <div className="mt-3 space-y-1.5 text-sm text-gray-700 dark:text-gray-200">
                      <p className="font-mono text-xs text-gray-500 dark:text-gray-400 break-all">
                        {formatChaveGrupos(result.chaveLimpa)}
                      </p>
                      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">UF:</span>
                        <span>{result.uf?.codigo} - {result.uf?.nome}</span>
                        <span className="text-gray-500 dark:text-gray-400">Ano/Mês:</span>
                        <span>{result.anoMes}</span>
                        <span className="text-gray-500 dark:text-gray-400">CNPJ:</span>
                        <span>{formatCNPJ(result.cnpj!)}</span>
                        <span className="text-gray-500 dark:text-gray-400">Modelo:</span>
                        <span>{result.modelo?.codigo} - {result.modelo?.descricao}</span>
                        <span className="text-gray-500 dark:text-gray-400">Série:</span>
                        <span>{result.serie}</span>
                        <span className="text-gray-500 dark:text-gray-400">Número:</span>
                        <span>{result.numero}</span>
                        <span className="text-gray-500 dark:text-gray-400">Código Numérico:</span>
                        <span>{result.cNF}</span>
                        <span className="text-gray-500 dark:text-gray-400">Tipo Emissão:</span>
                        <span>{result.tpEmis}</span>
                        <span className="text-gray-500 dark:text-gray-400">D.V. calculado:</span>
                        <span className="font-mono">{result.dvCalculado}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 px-5 py-4 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
