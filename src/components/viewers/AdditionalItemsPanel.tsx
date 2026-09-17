import { useEffect, useState } from "react";
import { FlaskConical, X } from "lucide-react";
import type { Nfe } from "@/types/nfe";
import { formatQuantity, formatCurrency } from "@/utils/formatters";

function formatDateOnly(value?: string): string {
  if (!value) return "";
  // Datas de rastreabilidade vêm como AAAA-MM-DD; evitar conversão de fuso.
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return value;
}

interface ItemWithExtras {
  nItem: string;
  cProd: string;
  xProd: string;
  rastro: NonNullable<Nfe["infNFe"]["det"][number]["prod"]["rastro"]>;
  med?: Nfe["infNFe"]["det"][number]["prod"]["med"];
}

export function AdditionalItemsPanel({ nfe }: { nfe: Nfe }) {
  const [open, setOpen] = useState(false);

  const items: ItemWithExtras[] = nfe.infNFe.det
    .filter((det) => (det.prod.rastro && det.prod.rastro.length > 0) || det.prod.med)
    .map((det) => ({
      nItem: det.nItem,
      cProd: det.prod.cProd,
      xProd: det.prod.xProd,
      rastro: det.prod.rastro ?? [],
      med: det.prod.med,
    }));

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open ]);

  if (items.length === 0) return null;

  return (
    <div className="no-print">
      {/* Abinha na borda direita: abre o drawer */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-label={`Abrir informações adicionais dos itens (${items.length} ${items.length === 1 ? "item" : "itens"})`}
          title="Informações adicionais dos itens (rastreabilidade / ANVISA)"
          className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-l-lg border border-r-0 border-gray-200 bg-white px-1.5 py-3 shadow-md transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <FlaskConical size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 [writing-mode:vertical-rl] dark:text-gray-300">
            Rastreabilidade
          </span>
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            {items.length}
          </span>
        </button>
      )}

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden={!open}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer lateral direito */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Informações adicionais dos itens"
        aria-hidden={!open}
        inert={!open}
        className={`fixed bottom-0 right-0 top-0 z-50 flex w-[400px] max-w-[90vw] flex-col border-l border-gray-200 bg-white shadow-xl transition-transform duration-200 dark:border-gray-700 dark:bg-gray-800 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <FlaskConical size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
              Informações adicionais dos itens
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                Rastreabilidade / ANVISA
              </span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                Não sai no PDF
              </span>
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar painel"
            title="Fechar (Esc)"
            className="shrink-0 rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {items.map((item) => (
            <div
              key={item.nItem}
              className="rounded-md border border-gray-200 p-3 dark:border-gray-700"
            >
              <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                <span className="text-gray-400 dark:text-gray-500">Item {item.nItem}</span>
                {" — "}
                <span className="text-gray-400 dark:text-gray-500">{item.cProd}</span>
                {" "}
                {item.xProd}
              </p>

              {item.rastro.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400">
                        <th className="border-b border-gray-200 py-1 pr-3 font-medium dark:border-gray-700">Lote</th>
                        <th className="border-b border-gray-200 py-1 pr-3 font-medium dark:border-gray-700">Qtd.</th>
                        <th className="border-b border-gray-200 py-1 pr-3 font-medium dark:border-gray-700">Fabricação</th>
                        <th className="border-b border-gray-200 py-1 pr-3 font-medium dark:border-gray-700">Validade</th>
                        <th className="border-b border-gray-200 py-1 font-medium dark:border-gray-700">Cód. agregação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.rastro.map((r, idx) => (
                        <tr key={`${item.nItem}-${idx}`} className="text-gray-700 dark:text-gray-200">
                          <td className="py-1 pr-3 font-mono">{r.nLote || "—"}</td>
                          <td className="py-1 pr-3">{r.qLote ? formatQuantity(r.qLote) : "—"}</td>
                          <td className="py-1 pr-3">{formatDateOnly(r.dFab) || "—"}</td>
                          <td className="py-1 pr-3">{formatDateOnly(r.dVal) || "—"}</td>
                          <td className="py-1 font-mono">{r.cAgreg || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {item.med && (
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-700 dark:text-gray-200">
                  {item.med.cProdANVISA && (
                    <span>
                      <span className="text-gray-500 dark:text-gray-400">Cód. ANVISA: </span>
                      <span className="font-mono">{item.med.cProdANVISA}</span>
                    </span>
                  )}
                  {item.med.vPMC && (
                    <span>
                      <span className="text-gray-500 dark:text-gray-400">Preço máx. consumidor (PMC): </span>
                      {formatCurrency(item.med.vPMC)}
                    </span>
                  )}
                  {item.med.xMotivoIsencao && (
                    <span>
                      <span className="text-gray-500 dark:text-gray-400">Isenção ANVISA: </span>
                      {item.med.xMotivoIsencao}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
