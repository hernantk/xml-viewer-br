import { useState } from "react";
import { ChevronDown, FlaskConical } from "lucide-react";
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
  const [open, setOpen] = useState(true);

  const items: ItemWithExtras[] = nfe.infNFe.det
    .filter((det) => (det.prod.rastro && det.prod.rastro.length > 0) || det.prod.med)
    .map((det) => ({
      nItem: det.nItem,
      cProd: det.prod.cProd,
      xProd: det.prod.xProd,
      rastro: det.prod.rastro ?? [],
      med: det.prod.med,
    }));

  if (items.length === 0) return null;

  return (
    <div className="mx-auto mt-4 max-w-[210mm] rounded-lg border border-gray-200 bg-white shadow-sm no-print dark:border-gray-700 dark:bg-gray-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-t-lg px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        <FlaskConical size={16} className="text-emerald-600 dark:text-emerald-400" />
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Informações adicionais dos itens
        </span>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          Rastreabilidade / ANVISA
        </span>
        <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
          Não sai no PDF
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4">
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
      )}
    </div>
  );
}
