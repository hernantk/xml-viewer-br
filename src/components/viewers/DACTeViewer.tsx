import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import type { Cte } from "@/types/cte";
import {
  formatCNPJorCPF,
  formatCurrency,
  formatQuantity,
  formatDate,
  formatDateTime,
  formatAccessKey,
  formatPhone,
  formatCEP,
  formatNFNumber,
  MODAL_TRANSPORTE,
} from "@/utils/formatters";
import {
  measureA4HeightPx,
  PAGE_PADDING_PX,
  PAGE_SAFETY_PX,
  chunkBlockKeys,
  arePageChunksEqual,
} from "@/utils/paginationUtils";
import { usePaginationResize } from "@/hooks/usePaginationResize";

interface Props {
  cte: Cte;
}

interface ContentBlock {
  key: string;
  node: React.ReactNode;
}

function Field({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
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

function FieldRight({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
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
        // Fallback
      }
    }
  }, [value]);

  return <svg ref={svgRef} className="w-full h-[40px]" />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-200 px-[2pt] py-[1pt] text-[7pt] font-bold uppercase leading-[1.1] border-b border-black">
      {children}
    </div>
  );
}

function PartyBlock({
  title,
  party,
}: {
  title: string;
  party?: {
    CNPJ?: string;
    CPF?: string;
    xNome: string;
    IE?: string;
    endereco: {
      xLgr: string;
      nro: string;
      xBairro: string;
      xMun: string;
      UF: string;
      CEP: string;
    };
    fone?: string;
  };
}) {
  if (!party) return null;
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      <div className="grid grid-cols-[1fr_170px_130px]">
        <Field label="Nome / RazÃ£o Social" value={party.xNome} />
        <Field label="CNPJ / CPF" value={formatCNPJorCPF(party.CNPJ || party.CPF)} />
        <Field label="IE" value={party.IE || ""} />
      </div>
      <div className="grid grid-cols-[1fr_150px_60px_120px]">
        <Field label="EndereÃ§o" value={`${party.endereco.xLgr}, ${party.endereco.nro}`} />
        <Field label="MunicÃ­pio" value={party.endereco.xMun} />
        <Field label="UF" value={party.endereco.UF} />
        <Field label="Fone" value={party.fone ? formatPhone(party.fone) : ""} />
      </div>
      <div className="grid grid-cols-[1fr_120px]">
        <Field label="Bairro" value={party.endereco.xBairro} />
        <Field label="CEP" value={formatCEP(party.endereco.CEP)} />
      </div>
    </div>
  );
}

export function DACTeViewer({ cte }: Props) {
  const { infCte, protCTe } = cte;
  const { ide, emit, rem, exped, receb, dest, vPrest, imp, infCTeNorm, infAdic } =
    infCte;
  const accessKey = protCTe?.infProt.chCTe || infCte.id.replace("CTe", "");

  const measureRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const receiptBlock = (
    <div>
        <div className="grid grid-cols-[1fr_auto] gap-0">
        <div className="rounded border border-black p-[3pt]">
          <div className="text-[7pt] leading-[1.2]">
            RECEBEMOS DE <span className="font-bold">{emit.xNome}</span> OS
            SERVIÃ‡OS CONSTANTES DO CONHECIMENTO DE TRANSPORTE ELETRÃ”NICO INDICADO
            AO LADO.
          </div>
          <div className="grid grid-cols-2 mt-[3pt] border-t border-black pt-[2pt]">
            <Field label="Data de Recebimento" value="" />
            <Field label="IdentificaÃ§Ã£o e Assinatura do Recebedor" value="" />
          </div>
        </div>
        <div className="rounded border border-black p-[3pt] text-center min-w-[110px] flex flex-col justify-center">
          <div className="text-[14pt] font-bold">CT-e</div>
          <div className="text-[10pt] font-bold mt-[2pt]">
            N.Âº <span className="font-bold">{ide.nCT}</span>
          </div>
          <div className="text-[10pt] font-bold">
            SÃ©rie <span className="font-bold">{ide.serie}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const separatorBlock = (
    <div className="border-b border-dashed border-black my-[3pt]" />
  );

  const headerBlock = (
    <div>
      <div className="grid grid-cols-[1fr_140px_1fr] gap-0">
        <div className="rounded border border-black p-[3pt] flex flex-col justify-center">
          <div className="text-[12pt] font-bold leading-[1.1]">{emit.xNome}</div>
          {emit.xFant && (
            <div className="text-[8pt] leading-[1.1]">
              {emit.xFant}
            </div>
          )}
          <div className="text-[8pt] mt-[2pt] leading-[1.1]">
            {emit.enderEmit.xLgr}, {emit.enderEmit.nro}
          </div>
          <div className="text-[8pt] leading-[1.1]">
            {emit.enderEmit.xBairro} - {emit.enderEmit.CEP ? formatCEP(emit.enderEmit.CEP) : emit.enderEmit.cMun}
          </div>
          <div className="text-[8pt] leading-[1.1]">
            {emit.enderEmit.xMun}/{emit.enderEmit.UF}
            {emit.enderEmit.fone ? ` Fone: ${formatPhone(emit.enderEmit.fone)}` : ""}
          </div>
        </div>

        <div className="rounded border border-black p-[3pt] text-center flex flex-col items-center justify-center">
          <div className="text-[14pt] font-bold tracking-wider">DACTE</div>
          <div className="text-[8pt] leading-[1.1]">
            Documento Auxiliar do
            <br />
            Conhecimento de Transporte
            <br />
            EletrÃ´nico
          </div>
          <div className="mt-[2pt] text-[10pt] font-bold">
            CT-e N.Âº <span className="font-bold">{formatNFNumber(ide.nCT)}</span>
          </div>
          <div className="text-[10pt] font-bold">
            SÃ©rie <span className="font-bold">{ide.serie}</span>
          </div>
          <div className="text-[8pt] mt-[2pt] leading-[1.1]">
            Modal:{" "}
            <span className="font-bold">
              {MODAL_TRANSPORTE[ide.modal] || ide.modal}
            </span>
          </div>
        </div>

        <div className="rounded border border-black p-[3pt] flex flex-col items-center justify-between">
          <div className="w-full px-2">
            <Barcode value={accessKey} />
          </div>
          <div className="text-[8pt] text-center font-bold leading-[1.1] break-all mt-[2pt]">
            {formatAccessKey(accessKey)}
          </div>
          <div className="text-[8pt] text-center leading-[1.1] mt-[1pt]">
            Consulta de autenticidade no portal nacional do CT-e
            <br />
            www.cte.fazenda.gov.br/portal
          </div>
          {protCTe && (
            <div className="text-[8pt] text-center mt-[1pt] leading-[1.1]">
              <div>
                Protocolo: <span className="font-bold">{protCTe.infProt.nProt}</span>
              </div>
              <div>{formatDateTime(protCTe.infProt.dhRecbto)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 border-t border-black">
        <Field label="CFOP" value={`${ide.CFOP} - ${ide.natOp}`} />
        <Field label="Data de EmissÃ£o" value={formatDate(ide.dhEmi)} />
        <Field label="Origem" value={`${ide.xMunIni}/${ide.UFIni}`} />
        <Field label="Destino" value={`${ide.xMunFim}/${ide.UFFim}`} />
      </div>
    </div>
  );

  const valuesBlock = (
    <div>
      <SectionTitle>Valores da PrestaÃ§Ã£o do ServiÃ§o</SectionTitle>
      <div className="grid grid-cols-3">
        <FieldRight
          label="Valor Total da PrestaÃ§Ã£o"
          value={formatCurrency(vPrest.vTPrest)}
        />
        <FieldRight label="Valor a Receber" value={formatCurrency(vPrest.vRec)} />
        <div className="rounded border border-black px-[2pt] py-[1pt]">
          <div className="text-[6pt] leading-[1.1] uppercase">
            Componentes
          </div>
          {vPrest.comp?.map((c, i) => (
            <div key={i} className="text-[8pt] flex justify-between leading-[1.1]">
              <span>{c.xNome}</span>
              <span className="font-bold">{formatCurrency(c.vComp)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const taxesBlock = (
    <div>
      <SectionTitle>InformaÃ§Ãµes Relativas ao Imposto</SectionTitle>
      <div className="grid grid-cols-5">
        <Field label="SituaÃ§Ã£o TributÃ¡ria" value={imp.ICMS.CST} />
        <FieldRight
          label="Base de CÃ¡lculo"
          value={imp.ICMS.vBC ? formatCurrency(imp.ICMS.vBC) : ""}
        />
        <FieldRight
          label="AlÃ­quota"
          value={imp.ICMS.pICMS ? `${imp.ICMS.pICMS}%` : ""}
        />
        <FieldRight
          label="Valor do ICMS"
          value={imp.ICMS.vICMS ? formatCurrency(imp.ICMS.vICMS) : ""}
        />
        <FieldRight
          label="Valor Total dos Tributos"
          value={imp.vTotTrib ? formatCurrency(imp.vTotTrib) : ""}
        />
      </div>
    </div>
  );

  const cargoBlock =
    infCTeNorm && (
      <div>
        <SectionTitle>InformaÃ§Ãµes da Carga</SectionTitle>
        <div className="grid grid-cols-3">
          <Field label="Produto Predominante" value={infCTeNorm.infCarga.proPred} />
          <FieldRight
            label="Valor da Carga"
            value={
              infCTeNorm.infCarga.vCarga
                ? formatCurrency(infCTeNorm.infCarga.vCarga)
                : ""
            }
          />
          <div className="rounded border border-black px-[2pt] py-[1pt]">
            <div className="text-[6pt] leading-[1.1] uppercase">
              Quantidades
            </div>
            {infCTeNorm.infCarga.infQ.map((q, i) => (
              <div key={i} className="text-[8pt] flex justify-between leading-[1.1]">
                <span>{q.tpMed}</span>
                <span className="font-bold">{formatQuantity(q.qCarga)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

  const docsBlock =
    infCTeNorm?.infDoc?.infNFe &&
    infCTeNorm.infDoc.infNFe.length > 0 && (
      <div>
        <SectionTitle>Documentos OriginÃ¡rios</SectionTitle>
        <div className="px-[2pt] py-[1pt] space-y-[1pt]">
          {infCTeNorm.infDoc.infNFe.map((nf, i) => (
            <div key={i} className="text-[8pt] leading-[1.1]">
              NF-e: {formatAccessKey(nf.chave)}
            </div>
          ))}
        </div>
      </div>
    );

  const additionalBlock = (
    <div>
      <SectionTitle>Dados Adicionais</SectionTitle>
      <div className="grid grid-cols-2">
        <div className="rounded border border-black px-[2pt] py-[1pt]">
          <div className="text-[6pt] leading-[1.1] uppercase">
            InformaÃ§Ãµes Complementares
          </div>
          <div className="text-[6pt] mt-[1pt] whitespace-pre-wrap min-h-[50px] leading-[1.1]">
            {infAdic?.infCpl || "\u00A0"}
          </div>
        </div>
        <div className="rounded border border-black px-[2pt] py-[1pt]">
          <div className="text-[6pt] leading-[1.1] uppercase">
            Reservado ao Fisco
          </div>
          <div className="text-[6pt] mt-[1pt] whitespace-pre-wrap min-h-[50px] leading-[1.1]">
            {infAdic?.infAdFisco || "\u00A0"}
          </div>
        </div>
      </div>
    </div>
  );

  const contentBlocks: ContentBlock[] = [
    { key: "receipt", node: receiptBlock },
    { key: "separator", node: separatorBlock },
    { key: "header", node: headerBlock },
    { key: "rem", node: <PartyBlock title="Remetente" party={rem} /> },
    { key: "dest", node: <PartyBlock title="DestinatÃ¡rio" party={dest} /> },
    { key: "exped", node: <PartyBlock title="Expedidor" party={exped} /> },
    { key: "receb", node: <PartyBlock title="Recebedor" party={receb} /> },
    { key: "values", node: valuesBlock },
    { key: "taxes", node: taxesBlock },
    ...(cargoBlock ? [{ key: "cargo", node: cargoBlock }] : []),
    ...(docsBlock ? [{ key: "docs", node: docsBlock }] : []),
    { key: "additional", node: additionalBlock },
  ];

  const blockKeys = contentBlocks.map((block) => block.key);
  const blockKeySignature = blockKeys.join("|");
  const [pageChunks, setPageChunks] = useState<string[][]>([blockKeys]);

  const recalculate = useCallback(() => {
    const pageContentHeight = Math.max(
      measureA4HeightPx() - PAGE_PADDING_PX * 2 - PAGE_SAFETY_PX,
      120,
    );
    const heights = blockKeys.map(
      (key) => measureRefs.current[key]?.getBoundingClientRect().height ?? 0,
    );
    const nextChunks = chunkBlockKeys(blockKeys, heights, pageContentHeight);
    setPageChunks((prev) => (arePageChunksEqual(prev, nextChunks) ? prev : nextChunks));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockKeySignature, cte]);

  useLayoutEffect(() => {
    recalculate();
  }, [recalculate]);

  usePaginationResize(recalculate);

  const findBlock = (key: string) => contentBlocks.find((block) => block.key === key);

  return (
    <div className="max-w-[210mm] mx-auto my-4 bg-white shadow-lg print:shadow-none print:my-0" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
      <div className="text-black">
        <div className="hidden pdf-hidden">
          {contentBlocks.map((block) => (
            <div key={block.key}>{block.node}</div>
          ))}
        </div>

        <div className="pdf-only">
          {pageChunks.map((chunk, index) => (
            <div key={`page-${index + 1}`}>
              {index > 0 && (
                <div className="pdf-hidden flex items-center py-5">
                  <div className="flex-1 border-t border-dashed border-gray-300" />
                  <span className="mx-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap">
                    Página {index + 1}
                  </span>
                  <div className="flex-1 border-t border-dashed border-gray-300" />
                </div>
              )}
              <section className="danfe-page p-4">
                {chunk.map((key) => (
                  <div key={key}>{findBlock(key)?.node ?? null}</div>
                ))}
              </section>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed -left-[200vw] top-0 w-[210mm] opacity-0 pointer-events-none no-print" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        {contentBlocks.map((block) => (
          <div
            key={`measure-${block.key}`}
            ref={(el) => {
              measureRefs.current[block.key] = el;
            }}
          >
            {block.node}
          </div>
        ))}
      </div>
    </div>
  );
}
