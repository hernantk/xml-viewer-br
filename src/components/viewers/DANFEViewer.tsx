import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import type { Nfe } from "@/types/nfe";
import {
  formatAccessKey,
  formatCEP,
  formatCNPJorCPF,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNFNumber,
  formatPhone,
  formatQuantity,
  formatTime,
  MODAL_FRETE,
  FORMA_PAGAMENTO,
} from "@/utils/formatters";
import {
  measureA4HeightPx,
  PAGE_PADDING_PX,
  PAGE_SAFETY_PX,
} from "@/utils/paginationUtils";
import { usePaginationResize } from "@/hooks/usePaginationResize";

const DANFE_ADDITIONAL_SECTION_SAFETY_PX = 48;

interface Props {
  nfe: Nfe;
}

// ---------------------------------------------------------------------------
// Reusable field components  (sizes match the reference Times New Roman PDF)
// ---------------------------------------------------------------------------
function Field({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded rounded border border-black px-[2pt] py-[1pt] ${className}`}>
      <div className="text-[6pt] leading-[1.1] uppercase">
        {label}
      </div>
      <div className="text-[10pt] font-bold leading-[1.1] break-words">
        {value || "\u00A0"}
      </div>
    </div>
  );
}

function FieldRight({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded rounded border border-black px-[2pt] py-[1pt] ${className}`}>
      <div className="text-[6pt] leading-[1.1] uppercase">
        {label}
      </div>
      <div className="text-[10pt] font-bold leading-[1.1] text-right">
        {value || "\u00A0"}
      </div>
    </div>
  );
}

function FieldSmallRight({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded rounded border border-black px-[2pt] py-[1pt] ${className}`}>
      <div className="text-[5pt] leading-[1.1] uppercase">
        {label}
      </div>
      <div className="text-[10pt] font-bold leading-[1.1] text-right">
        {value || "\u00A0"}
      </div>
    </div>
  );
}

function Barcode({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          displayValue: false,
          height: 40,
          width: 1,
          margin: 0,
          background: "transparent",
        });
      } catch {
        // Ignore barcode render failures in preview.
      }
    }
  }, [value]);

  return <svg ref={svgRef} className="w-full h-[35px]" />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-200 px-[2pt] py-[1pt] text-[7pt] font-bold uppercase leading-[1.1] border-b border-black">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header block with page counter ("Folha X/Y")
// ---------------------------------------------------------------------------
function DanfeHeaderBlock({
  emit,
  ide,
  protNFe,
  accessKey,
  pageInfo,
}: Pick<Nfe["infNFe"], "emit" | "ide"> & {
  protNFe: Nfe["protNFe"];
  accessKey: string;
  pageInfo?: { current: number; total: number };
}) {
  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif" }}>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-0">
        {/* Left: Emitente */}
        <div className="rounded border border-black p-[3pt] flex flex-col items-center justify-center text-center">
          <div className="text-[6pt] italic leading-[1.1]">IDENTIFICAÇÃO DO EMITENTE</div>
          <div className="text-[12pt] font-bold leading-[1.1] mt-[2pt]">{emit.xNome}</div>
          {emit.xFant && (
            <div className="text-[8pt] leading-[1.1]">{emit.xFant}</div>
          )}
          <div className="text-[8pt] mt-[2pt] leading-[1.1]">
            {emit.enderEmit.xLgr}, {emit.enderEmit.nro}
            {emit.enderEmit.xCpl && ` - ${emit.enderEmit.xCpl}`}
          </div>
          <div className="text-[8pt] leading-[1.1]">
            {emit.enderEmit.xBairro} - {emit.enderEmit.CEP ? formatCEP(emit.enderEmit.CEP) : emit.enderEmit.cMun}
          </div>
          <div className="text-[8pt] leading-[1.1]">
            {emit.enderEmit.xMun} - {emit.enderEmit.UF}
            {emit.enderEmit.fone ? ` Fone/Fax: ${formatPhone(emit.enderEmit.fone)}` : " Fone/Fax:"}
          </div>
        </div>

        {/* Center: DANFE */}
        <div className="rounded border border-black p-[3pt] text-center flex flex-col items-center justify-center min-w-[110px]">
          <div className="text-[14pt] font-bold tracking-wider">DANFE</div>
          <div className="text-[8pt] leading-[1.1]">
            Documento Auxiliar da Nota
          </div>
          <div className="text-[8pt] leading-[1.1]">
            Fiscal Eletrônica
          </div>
          <div className="mt-[2pt] text-[8pt] leading-[1.1]">
            {ide.tpNF === "0" ? "0 - ENTRADA" : "1 - SAÍDA"}
          </div>
          <div className="text-[8pt] leading-[1.1]">
            {ide.tpNF === "0" ? "1 - SAÍDA" : "0 - ENTRADA"}
          </div>
          <div className="text-[12pt] font-bold mt-[2pt]">{ide.tpNF}</div>
          <div className="text-[10pt] font-bold mt-[2pt] leading-[1.1]">
            N.º <span className="font-bold">{formatNFNumber(ide.nNF)}</span>
          </div>
          <div className="text-[10pt] font-bold leading-[1.1]">
            Série <span className="font-bold">{ide.serie}</span>
          </div>
          {pageInfo && (
            <div className="text-[8pt] italic leading-[1.1] mt-[2pt]">
              Folha {pageInfo.current}/{pageInfo.total}
            </div>
          )}
        </div>

        {/* Right: Chave de Acesso + Barcode */}
        <div className="rounded border border-black p-[3pt] flex flex-col items-center justify-between">
          <div className="text-[6pt] leading-[1.1] self-start">CHAVE DE ACESSO</div>
          <div className="w-full px-1 mt-[2pt]">
            <Barcode value={accessKey} />
          </div>
          <div className="text-[8pt] text-center font-bold leading-[1.1] break-all mt-[2pt]">
            {formatAccessKey(accessKey)}
          </div>
          <div className="text-[8pt] text-center leading-[1.1] mt-[1pt]">
            Consulta de autenticidade no portal nacional da NF-e
          </div>
          <div className="text-[8pt] text-center leading-[1.1]">
            www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora
          </div>
          {protNFe && (
            <div className="text-[8pt] text-center leading-[1.1] mt-[1pt]">
              <div>
                Protocolo de Autorização:{" "}
                <span className="font-bold">{protNFe.infProt.nProt}</span>
              </div>
              <div>{formatDateTime(protNFe.infProt.dhRecbto)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Natureza da Operação + Protocolo */}
      <div className="grid grid-cols-[1fr_auto]">
        <Field label="Natureza da Operação" value={ide.natOp} />
        <div className="rounded border border-black px-[2pt] py-[1pt] min-w-[160px]">
          <div className="text-[6pt] leading-[1.1] uppercase">
            Protocolo de Autorização de Uso
          </div>
          <div className="text-[8pt] font-bold leading-[1.1]">
            {protNFe ? `${protNFe.infProt.nProt} - ${formatDateTime(protNFe.infProt.dhRecbto)}` : "\u00A0"}
          </div>
        </div>
      </div>

      {/* IE / IM / IE ST / CNPJ */}
      <div className="grid grid-cols-4">
        <Field label="Inscrição Estadual" value={emit.IE} />
        <Field label="Inscrição Municipal" value={emit.IM || ""} />
        <Field label="Inscrição Estadual do Subst. Tributário" value="" />
        <Field label="CNPJ / CPF" value={formatCNPJorCPF(emit.CNPJ || emit.CPF)} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product rows
// ---------------------------------------------------------------------------
function ProductRows({
  items,
  rowRefs,
}: {
  items: Nfe["infNFe"]["det"];
  rowRefs?: React.MutableRefObject<(HTMLTableRowElement | null)[]>;
}) {
  return (
    <>
      {items.map((item, index) => (
        <tr
          key={item.nItem}
          ref={(el) => {
            if (rowRefs) {
              rowRefs.current[index] = el;
            }
          }}
        >
          <td className="border border-black px-[1pt] py-[1pt] align-top text-[6pt]">{item.prod.cProd}</td>
          <td className="border border-black px-[1pt] py-[1pt] align-top text-[6pt]">{item.prod.xProd}</td>
          <td className="border border-black px-[1pt] py-[1pt] text-center align-top text-[6pt]">{item.prod.NCM}</td>
          <td className="border border-black px-[1pt] py-[1pt] text-center align-top text-[6pt]">
            {item.imposto.ICMS?.orig || ""}{item.imposto.ICMS?.CST || item.imposto.ICMS?.CSOSN || ""}
          </td>
          <td className="border border-black px-[1pt] py-[1pt] text-center align-top text-[6pt]">{item.prod.CFOP}</td>
          <td className="border border-black px-[1pt] py-[1pt] text-center align-top text-[6pt]">{item.prod.uCom}</td>
          <td className="border border-black px-[1pt] py-[1pt] text-right align-top text-[6pt]">{formatQuantity(item.prod.qCom)}</td>
          <td className="border border-black px-[1pt] py-[1pt] text-right align-top text-[6pt]">{formatCurrency(item.prod.vUnCom)}</td>
          <td className="border border-black px-[1pt] py-[1pt] text-right align-top text-[6pt]">{formatCurrency(item.prod.vProd)}</td>
          <td className="border border-black px-[1pt] py-[1pt] text-right align-top text-[6pt]">{item.prod.vDesc ? formatCurrency(item.prod.vDesc) : ""}</td>
          <td className="border border-black px-[1pt] py-[1pt] text-right align-top text-[6pt]">{item.imposto.ICMS?.vBC ? formatCurrency(item.imposto.ICMS.vBC) : ""}</td>
          <td className="border border-black px-[1pt] py-[1pt] text-right align-top text-[6pt]">{item.imposto.ICMS?.vICMS ? formatCurrency(item.imposto.ICMS.vICMS) : ""}</td>
          <td className="border border-black px-[1pt] py-[1pt] text-right align-top text-[6pt]">{item.imposto.IPI?.vIPI ? formatCurrency(item.imposto.IPI.vIPI) : ""}</td>
          <td className="border border-black px-[1pt] py-[1pt] text-right align-top text-[6pt]">{item.imposto.ICMS?.pICMS || ""}</td>
          <td className="border border-black px-[1pt] py-[1pt] text-right align-top text-[6pt]">{item.imposto.IPI?.pIPI || ""}</td>
        </tr>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Products table with 15 columns (including VALOR DESC)
// ---------------------------------------------------------------------------
function ProductsTable({
  items,
  rowRefs,
  headRef,
  titleRef,
}: {
  items: Nfe["infNFe"]["det"];
  rowRefs?: React.MutableRefObject<(HTMLTableRowElement | null)[]>;
  headRef?: React.Ref<HTMLTableSectionElement>;
  titleRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div>
      <div ref={titleRef}>
        <SectionTitle>Dados dos Produtos / Serviços</SectionTitle>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[6pt] border-collapse">
          <thead ref={headRef}>
            <tr className="bg-gray-200">
              <th className="border border-black px-[1pt] py-[1pt] text-left font-bold uppercase">Código<br/>Produto</th>
              <th className="border border-black px-[1pt] py-[1pt] text-left font-bold uppercase">Descrição do Produto / Serviço</th>
              <th className="border border-black px-[1pt] py-[1pt] text-center font-bold uppercase">NCM/SH</th>
              <th className="border border-black px-[1pt] py-[1pt] text-center font-bold uppercase">O/CST</th>
              <th className="border border-black px-[1pt] py-[1pt] text-center font-bold uppercase">CFOP</th>
              <th className="border border-black px-[1pt] py-[1pt] text-center font-bold uppercase">UN</th>
              <th className="border border-black px-[1pt] py-[1pt] text-center font-bold uppercase">Quant</th>
              <th className="border border-black px-[1pt] py-[1pt] text-center font-bold uppercase">Valor<br/>Unit</th>
              <th className="border border-black px-[1pt] py-[1pt] text-center font-bold uppercase">Valor<br/>Total</th>
              <th className="border border-black px-[1pt] py-[1pt] text-center font-bold uppercase">Valor<br/>Desc</th>
              <th className="border border-black px-[1pt] py-[1pt] text-center font-bold uppercase">B.Cálc<br/>ICMS</th>
              <th className="border border-black px-[1pt] py-[1pt] text-center font-bold uppercase">Valor<br/>ICMS</th>
              <th className="border border-black px-[1pt] py-[1pt] text-center font-bold uppercase">Valor<br/>IPI</th>
              <th className="border border-black px-[1pt] py-[1pt] text-center font-bold uppercase">Alíq.<br/>ICMS</th>
              <th className="border border-black px-[1pt] py-[1pt] text-center font-bold uppercase">Alíq.<br/>IPI</th>
            </tr>
          </thead>
          <tbody>
            <ProductRows items={items} rowRefs={rowRefs} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination logic
// ---------------------------------------------------------------------------
function chunkProducts(
  rowHeights: number[],
  firstPageAvailable: number,
  nextPageAvailable: number,
) {
  const chunks: number[][] = [];
  let currentChunk: number[] = [];
  let remaining = firstPageAvailable;

  rowHeights.forEach((height, index) => {
    const safeHeight = Math.max(height, 1);
    if (currentChunk.length > 0 && safeHeight > remaining) {
      chunks.push(currentChunk);
      currentChunk = [];
      remaining = nextPageAvailable;
    }

    currentChunk.push(index);
    remaining -= safeHeight;

    if (remaining <= 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      remaining = nextPageAvailable;
    }
  });

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [rowHeights.map((_, index) => index)];
}

// ---------------------------------------------------------------------------
// Main DANFE Viewer
// ---------------------------------------------------------------------------
export function DANFEViewer({ nfe }: Props) {
  const { infNFe, protNFe } = nfe;
  const { ide, emit, dest, det, total, transp, cobr, pag, infAdic } = infNFe;
  const accessKey = protNFe?.infProt.chNFe || infNFe.id.replace("NFe", "");

  const measureFirstPageRef = useRef<HTMLDivElement>(null);
  const measureContinuationHeaderRef = useRef<HTMLDivElement>(null);
  const measureAdditionalRef = useRef<HTMLDivElement>(null);
  const measureProductsHeadRef = useRef<HTMLTableSectionElement>(null);
  const measureProductsTitleRef = useRef<HTMLDivElement>(null);
  const measureRowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const [pageChunks, setPageChunks] = useState<number[][]>([det.map((_, index) => index)]);

  const totalPages = pageChunks.length;

  // ---- Receipt block ----
  const receiptBlock = (
    <div>
      <div className="grid grid-cols-[1fr_auto] gap-0">
        <div className="rounded border border-black p-[3pt]">
          <div className="text-[7pt] leading-[1.2]">
            RECEBEMOS DE <span className="font-bold">{emit.xNome}</span> OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA ABAIXO.
          </div>
          <div className="text-[7pt] leading-[1.2] mt-[1pt]">
            EMISSÃO: {formatDate(ide.dhEmi)} VALOR TOTAL: {formatCurrency(total.ICMSTot.vNF)}
            {dest?.xNome && (
              <> DESTINATÁRIO: {dest.xNome}{dest.enderDest ? ` - ${dest.enderDest.xLgr}, ${dest.enderDest.nro} ${dest.enderDest.xBairro} ${dest.enderDest.xMun}-${dest.enderDest.UF}` : ""}</>
            )}
          </div>
          <div className="grid grid-cols-2 mt-[3pt] border-t border-black pt-[2pt]">
            <Field label="Data de Recebimento" value="" />
            <Field label="Identificação e Assinatura do Recebedor" value="" />
          </div>
        </div>
        <div className="rounded border border-black p-[3pt] text-center min-w-[100px] flex flex-col justify-center">
          <div className="text-[14pt] font-bold">NF-e</div>
          <div className="text-[10pt] font-bold mt-[2pt]">
            N.º <span className="font-bold">{formatNFNumber(ide.nNF)}</span>
          </div>
          <div className="text-[10pt] font-bold">
            Série <span className="font-bold">{ide.serie}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ---- Destinatário ----
  const recipientSection = (
    <div>
      <SectionTitle>Destinatário / Remetente</SectionTitle>
      <div className="grid grid-cols-[1fr_auto_auto]">
        <Field label="Nome / Razão Social" value={dest?.xNome || ""} />
        <Field label="CNPJ / CPF" value={formatCNPJorCPF(dest?.CNPJ || dest?.CPF)} className="min-w-[140px]" />
        <Field label="Data da Emissão" value={formatDate(ide.dhEmi)} className="min-w-[100px]" />
      </div>
      <div className="grid grid-cols-[1fr_auto_auto_auto]">
        <Field label="Endereço" value={dest?.enderDest ? `${dest.enderDest.xLgr}, ${dest.enderDest.nro}${dest.enderDest.xCpl ? ` - ${dest.enderDest.xCpl}` : ""}` : ""} />
        <Field label="Bairro / Distrito" value={dest?.enderDest?.xBairro || ""} className="min-w-[130px]" />
        <Field label="CEP" value={dest?.enderDest?.CEP ? formatCEP(dest.enderDest.CEP) : ""} className="min-w-[80px]" />
        <Field label="Data da Saída/Entrada" value={ide.dhSaiEnt ? formatDate(ide.dhSaiEnt) : ""} className="min-w-[100px]" />
      </div>
      <div className="grid grid-cols-[1fr_40px_120px_1.2fr_100px]">
        <Field label="Município" value={dest?.enderDest?.xMun || ""} />
        <Field label="UF" value={dest?.enderDest?.UF || ""} />
        <Field label="Fone / Fax" value={formatPhone(dest?.enderDest?.fone)} />
        <Field label="Inscrição Estadual" value={dest?.IE || ""} />
        <Field label="Hora da Saída/Entrada" value={ide.dhSaiEnt ? formatTime(ide.dhSaiEnt) : ""} />
      </div>
    </div>
  );

  // ---- Pagamento ----
  const pagamentoSection = pag && pag.detPag.length > 0 && (
    <div>
      <SectionTitle>Pagamento</SectionTitle>
      <div className="grid grid-cols-2">
        <div className="rounded border border-black px-[2pt] py-[1pt]">
          <div className="text-[6pt] uppercase leading-[1.1]">Forma</div>
          <div className="text-[7pt] font-bold leading-[1.1]">
            {pag.detPag.map((dp) => FORMA_PAGAMENTO[dp.tPag] || dp.tPag).join(", ")}
          </div>
        </div>
        <div className="rounded border border-black px-[2pt] py-[1pt]">
          <div className="text-[6pt] uppercase leading-[1.1]">Valor</div>
          <div className="text-[7pt] font-bold leading-[1.1]">
            {formatCurrency(pag.detPag.reduce((sum, dp) => sum + parseFloat(dp.vPag || "0"), 0))}
          </div>
        </div>
      </div>
    </div>
  );

  // ---- Cálculo do Imposto (4-column grid) ----
  const impostoSection = (
    <div>
      <SectionTitle>Cálculo do Imposto</SectionTitle>
      <div className="grid grid-cols-4">
        <FieldSmallRight label="Base de Cálc. do ICMS" value={formatCurrency(total.ICMSTot.vBC)} />
        <FieldSmallRight label="Valor do ICMS" value={formatCurrency(total.ICMSTot.vICMS)} />
        <FieldSmallRight label="Base de Cálc. ICMS S.T." value={formatCurrency(total.ICMSTot.vBCST)} />
        <FieldSmallRight label="Valor do ICMS Subst." value={formatCurrency(total.ICMSTot.vST)} />
      </div>
      <div className="grid grid-cols-4">
        <FieldSmallRight label="V. Imp. Importação" value={formatCurrency(total.ICMSTot.vII)} />
        <FieldSmallRight label="V. ICMS UF Remet." value="" />
        <FieldSmallRight label="V. FCP UF Dest." value={formatCurrency(total.ICMSTot.vFCP)} />
        <FieldSmallRight label="Valor do PIS" value={formatCurrency(total.ICMSTot.vPIS)} />
      </div>
      <div className="grid grid-cols-4">
        <FieldSmallRight label="V. Total dos Produtos" value={formatCurrency(total.ICMSTot.vProd)} />
        <FieldSmallRight label="Valor do Frete" value={formatCurrency(total.ICMSTot.vFrete)} />
        <FieldSmallRight label="Valor do Seguro" value={formatCurrency(total.ICMSTot.vSeg)} />
        <FieldSmallRight label="Desconto" value={formatCurrency(total.ICMSTot.vDesc)} />
      </div>
      <div className="grid grid-cols-4">
        <FieldSmallRight label="Outras Despesas" value={formatCurrency(total.ICMSTot.vOutro)} />
        <FieldSmallRight label="Valor Total IPI" value={formatCurrency(total.ICMSTot.vIPI)} />
        <FieldSmallRight label="V. ICMS UF Dest." value="" />
        <FieldSmallRight label="V. Tot. Trib." value={total.ICMSTot.vTotTrib ? formatCurrency(total.ICMSTot.vTotTrib) : ""} />
      </div>
      <div className="grid grid-cols-4">
        <FieldSmallRight label="Valor da COFINS" value={formatCurrency(total.ICMSTot.vCOFINS)} />
        <FieldSmallRight label="V. Total da Nota" value={formatCurrency(total.ICMSTot.vNF)} className="font-bold" />
        <div className="rounded border border-black px-[2pt] py-[1pt]" />
        <div className="rounded border border-black px-[2pt] py-[1pt]" />
      </div>
    </div>
  );

  // ---- Transportador ----
  const transportadoraSection = (
    <div>
      <SectionTitle>Transportador / Volumes Transportados</SectionTitle>
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto]">
        <Field label="Nome / Razão Social" value={transp.transporta?.xNome || ""} />
        <Field
          label="Frete"
          value={MODAL_FRETE[transp.modFrete] || transp.modFrete}
          className="min-w-[160px]"
        />
        <Field label="Código ANTT" value={transp.veicTransp?.RNTRC || ""} className="min-w-[100px]" />
        <Field label="Placa do Veículo" value={transp.veicTransp?.placa || ""} className="min-w-[90px]" />
        <Field label="UF" value={transp.veicTransp?.UF || ""} className="min-w-[40px]" />
      </div>
      <div className="grid grid-cols-[1fr_auto_60px_auto]">
        <Field label="Endereço" value={transp.transporta?.xEnder || ""} />
        <Field label="Município" value={transp.transporta?.xMun || ""} className="min-w-[130px]" />
        <Field label="UF" value={transp.transporta?.UF || ""} />
        <Field label="Inscrição Estadual" value={transp.transporta?.IE || ""} className="min-w-[130px]" />
      </div>
      <div className="grid grid-cols-[1fr_auto_auto_auto]">
        <Field label="CNPJ / CPF" value={formatCNPJorCPF(transp.transporta?.CNPJ || transp.transporta?.CPF)} />
        {transp.vol && transp.vol.length > 0 && (
          <>
            <Field label="Quantidade" value={transp.vol[0]?.qVol || ""} className="min-w-[80px]" />
            <Field label="Espécie" value={transp.vol[0]?.esp || ""} className="min-w-[80px]" />
            <Field label="Marca" value={transp.vol[0]?.marca || ""} className="min-w-[80px]" />
          </>
        )}
        {!transp.vol && (
          <>
            <Field label="Quantidade" value="" />
            <Field label="Espécie" value="" />
            <Field label="Marca" value="" />
          </>
        )}
      </div>
      {(transp.vol && transp.vol.length > 0) ? (
        <div className="grid grid-cols-4">
          <Field label="Numeração" value={transp.vol[0]?.nVol || ""} />
          <FieldRight label="Peso Bruto" value={transp.vol[0]?.pesoB ? formatQuantity(transp.vol[0].pesoB) : ""} />
          <FieldRight label="Peso Líquido" value={transp.vol[0]?.pesoL ? formatQuantity(transp.vol[0].pesoL) : ""} />
          <div className="rounded border border-black px-[2pt] py-[1pt]" />
        </div>
      ) : (
        <div className="grid grid-cols-4">
          <Field label="Numeração" value="" />
          <FieldRight label="Peso Bruto" value="" />
          <FieldRight label="Peso Líquido" value="" />
          <div className="rounded border border-black px-[2pt] py-[1pt]" />
        </div>
      )}
    </div>
  );

  // ---- Dados Adicionais ----
  const additionalSection = (
    <div className="break-inside-avoid">
      <SectionTitle>Dados Adicionais</SectionTitle>
      <div className="grid grid-cols-2">
        <div className="rounded border border-black px-[2pt] py-[1pt]">
          <div className="text-[6pt] uppercase leading-[1.1]">
            Informações Complementares
          </div>
          <div className="text-[6pt] mt-[1pt] whitespace-pre-wrap min-h-[50px] leading-[1.1]">
            {infAdic?.infCpl || "\u00A0"}
          </div>
        </div>
        <div className="rounded border border-black px-[2pt] py-[1pt]">
          <div className="text-[6pt] uppercase leading-[1.1]">
            Reservado ao Fisco
          </div>
          <div className="text-[6pt] mt-[1pt] whitespace-pre-wrap min-h-[50px] leading-[1.1]">
            {infAdic?.infAdFisco || "\u00A0"}
          </div>
        </div>
      </div>
    </div>
  );

  // ---- Sections for assembly ----
  const faturaSection = cobr && (cobr.fat || (cobr.dup && cobr.dup.length > 0)) && (
    <div>
      <SectionTitle>Fatura / Duplicata</SectionTitle>
      {cobr.fat && (
        <div className="grid grid-cols-4">
          <Field label="Número da Fatura" value={cobr.fat.nFat || ""} />
          <FieldRight label="Valor Original" value={cobr.fat.vOrig ? formatCurrency(cobr.fat.vOrig) : ""} />
          <FieldRight label="Valor do Desconto" value={cobr.fat.vDesc ? formatCurrency(cobr.fat.vDesc) : ""} />
          <FieldRight label="Valor Líquido" value={cobr.fat.vLiq ? formatCurrency(cobr.fat.vLiq) : ""} />
        </div>
      )}
      {cobr.dup && cobr.dup.length > 0 && cobr.dup.length <= 20 && (
        <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10">
          {cobr.dup.map((dup) => (
            <div key={dup.nDup} className="rounded border border-black px-[2pt] py-[1pt] text-[8pt]">
              <div className="font-bold">Nº {dup.nDup}</div>
              <div>{formatDate(dup.dVenc)}</div>
              <div className="text-right font-bold">{formatCurrency(dup.vDup)}</div>
            </div>
          ))}
        </div>
      )}
      {cobr.dup && cobr.dup.length > 20 && (
        <div className="px-[2pt] py-[1pt] text-[8pt]">
          Existem mais de {cobr.dup.length} duplicatas registradas, portanto não serão exibidas, confira diretamente pelo XML.
        </div>
      )}
    </div>
  );

  const topSections = (
    <>
      {recipientSection}
      {faturaSection}
      {pagamentoSection}
      {impostoSection}
      {transportadoraSection}
    </>
  );

  const headerBlockWithPage = (pageNum: number) => (
    <DanfeHeaderBlock
      emit={emit}
      ide={ide}
      protNFe={protNFe}
      accessKey={accessKey}
      pageInfo={{ current: pageNum, total: totalPages }}
    />
  );

  // ---- Layout measurement & recalculation ----
  const recalculate = useCallback(() => {
    if (
      !measureFirstPageRef.current ||
      !measureContinuationHeaderRef.current ||
      !measureAdditionalRef.current ||
      !measureProductsHeadRef.current ||
      !measureProductsTitleRef.current
    ) {
      return;
    }

    const pageContentHeight = measureA4HeightPx() - PAGE_PADDING_PX * 2 - PAGE_SAFETY_PX;

    const firstPageStaticHeight = measureFirstPageRef.current.getBoundingClientRect().height;
    const continuationHeaderHeight = measureContinuationHeaderRef.current.getBoundingClientRect().height;
    const additionalHeight = measureAdditionalRef.current.getBoundingClientRect().height;
    const productsHeadHeight =
      measureProductsTitleRef.current.getBoundingClientRect().height +
      measureProductsHeadRef.current.getBoundingClientRect().height;
    const rowHeights = det.map((_, index) => measureRowRefs.current[index]?.getBoundingClientRect().height ?? 0);

    const firstPageAvailable = Math.max(
      pageContentHeight - firstPageStaticHeight - additionalHeight - productsHeadHeight - DANFE_ADDITIONAL_SECTION_SAFETY_PX,
      40,
    );
    const continuationPageAvailable = Math.max(
      pageContentHeight - continuationHeaderHeight - productsHeadHeight,
      40,
    );

    setPageChunks(chunkProducts(rowHeights, firstPageAvailable, continuationPageAvailable));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [det, emit, ide, protNFe, accessKey, dest, total, transp, cobr, pag, infAdic]);

  useLayoutEffect(() => {
    recalculate();
  }, [recalculate]);

  usePaginationResize(recalculate);

  const productPages = pageChunks
    .map((chunk) => chunk
      .filter((index) => index >= 0 && index < det.length)
      .map((index) => det[index])
      .filter((item): item is Nfe["infNFe"]["det"][number] => Boolean(item)))
    .filter((chunk) => chunk.length > 0);
  const firstPageProducts = productPages[0] ?? det;
  const continuationProductPages = productPages.slice(1);

  const defaultContent = (
    <>
      {receiptBlock}
      {headerBlockWithPage(1)}
      {topSections}
      <ProductsTable items={det} />
      {additionalSection}
    </>
  );

  return (
    <div className="max-w-[210mm] mx-auto my-4 bg-white shadow-lg print:shadow-none print:my-0" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
      <div className="text-black">
        {/* Hidden measurement reference (not shown on screen or PDF) */}
        <div className="hidden pdf-hidden">
          {defaultContent}
        </div>

        {/* Actual PDF output */}
        <div className="pdf-only">
          <section className="danfe-page p-4">
            {receiptBlock}
            {headerBlockWithPage(1)}
            {topSections}
            {firstPageProducts.length > 0 && <ProductsTable items={firstPageProducts} />}
            {additionalSection}
          </section>

          {continuationProductPages.map((items, index) => {
            const pageNum = index + 2;
            return (
              <div key={`page-${pageNum}`}>
                <div className="pdf-hidden flex items-center py-5">
                  <div className="flex-1 border-t border-dashed border-gray-300" />
                  <span className="mx-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap">
                    Página {pageNum}
                  </span>
                  <div className="flex-1 border-t border-dashed border-gray-300" />
                </div>
                <section className="danfe-page p-4 break-before-page">
                  {headerBlockWithPage(pageNum)}
                  <ProductsTable items={items} />
                </section>
              </div>
            );
          })}
        </div>
      </div>

      {/*
        Off-screen measurement surface.
      */}
      <div className="fixed -left-[200vw] top-0 w-[210mm] opacity-0 pointer-events-none no-print" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        <div className="p-4">
          <div ref={measureFirstPageRef}>
            {receiptBlock}
            {headerBlockWithPage(1)}
            {topSections}
          </div>
          <div ref={measureAdditionalRef}>
            {additionalSection}
          </div>
          <ProductsTable items={det} rowRefs={measureRowRefs} headRef={measureProductsHeadRef} titleRef={measureProductsTitleRef} />
        </div>
        <div className="p-4">
          <div ref={measureContinuationHeaderRef}>
            {headerBlockWithPage(1)}
          </div>
        </div>
      </div>
    </div>
  );
}
