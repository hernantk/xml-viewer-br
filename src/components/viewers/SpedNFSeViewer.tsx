import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { SpedCompNfse } from "@/types/nfse";
import { formatCNPJorCPF, formatCurrency, formatDate, formatDateTime, formatCEP } from "@/utils/formatters";
import {
  measureA4HeightPx,
  PAGE_PADDING_PX,
  PAGE_SAFETY_PX,
  chunkBlockKeys,
  arePageChunksEqual,
} from "@/utils/paginationUtils";
import { usePaginationResize } from "@/hooks/usePaginationResize";

interface Props {
  nfse: SpedCompNfse;
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-200 px-[2pt] py-[1pt] text-[7pt] font-bold uppercase leading-[1.1] border-b border-black">
      {children}
    </div>
  );
}

export function SpedNFSeViewer({ nfse }: Props) {
  const { infNFSe } = nfse;
  const dps = infNFSe.dps;
  const infDps = dps?.infDPS;

  const measureRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const headerBlock = (
    <div>
      <div className="rounded border border-black p-[3pt] text-center" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        <div className="text-[14pt] font-bold tracking-wider">
          NOTA FISCAL DE SERVIÇO ELETRÔNICA - NFS-e
        </div>
        <div className="text-[8pt] leading-[1.1] mt-[2pt]">Padrão Nacional</div>
      </div>
      <div className="grid grid-cols-4">
        <Field label="Número da NFS-e" value={infNFSe.nNFSe} />
        <Field label="Data de Emissão" value={formatDateTime(infNFSe.dhProc)} />
        <Field label="Série" value={infDps?.serie || ""} />
        <Field label="Nº DPS" value={infDps?.nDPS || ""} />
      </div>
      {infDps && (
        <div className="grid grid-cols-3">
          <Field label="Competência" value={formatDate(infDps.dCompet)} />
          <Field label="Local de Emissão" value={infNFSe.xLocEmi} />
          <Field label="Local de Incidência" value={infNFSe.xLocIncid} />
        </div>
      )}
    </div>
  );

  const providerBlock = (
    <div>
      <SectionTitle>Prestador de Serviços</SectionTitle>
      <div className="grid grid-cols-[1fr_170px]">
        <Field label="Razão Social" value={infNFSe.emit.xNome} />
        <Field label="CNPJ" value={formatCNPJorCPF(infNFSe.emit.CNPJ)} />
      </div>
      <div className="grid grid-cols-[1fr_150px_60px_100px]">
        <Field
          label="Endereço"
          value={`${infNFSe.emit.enderNac.xLgr}, ${infNFSe.emit.enderNac.nro}`}
        />
        <Field label="Bairro" value={infNFSe.emit.enderNac.xBairro} />
        <Field label="UF" value={infNFSe.emit.enderNac.UF} />
        <Field label="CEP" value={formatCEP(infNFSe.emit.enderNac.CEP)} />
      </div>
      <div className="grid grid-cols-2">
        <Field label="Telefone" value={infNFSe.emit.fone || ""} />
        <Field label="E-mail" value={infNFSe.emit.email || ""} />
      </div>
    </div>
  );

  const customerBlock = infDps && (
    <div>
      <SectionTitle>Tomador de Serviços</SectionTitle>
      <div className="grid grid-cols-[1fr_170px]">
        <Field label="Razão Social" value={infDps.toma.xNome} />
        <Field
          label="CNPJ / CPF"
          value={formatCNPJorCPF(infDps.toma.CNPJ || infDps.toma.CPF)}
        />
      </div>
      {infDps.toma.end && (
        <div className="grid grid-cols-[1fr_150px_60px_100px]">
          <Field
            label="Endereço"
            value={`${infDps.toma.end.xLgr}, ${infDps.toma.end.nro}${infDps.toma.end.xCpl ? ` - ${infDps.toma.end.xCpl}` : ""}`}
          />
          <Field label="Bairro" value={infDps.toma.end.xBairro} />
          <Field label="UF" value="" />
          <Field label="CEP" value={infDps.toma.end.endNac.CEP ? formatCEP(infDps.toma.end.endNac.CEP) : ""} />
        </div>
      )}
      {infDps.toma.email && (
        <Field label="E-mail" value={infDps.toma.email} />
      )}
    </div>
  );

  const serviceBlock = infDps && (
    <div>
      <SectionTitle>Discriminação do Serviço</SectionTitle>
      <div className="grid grid-cols-2">
        <Field label="Código Tributação Nacional" value={infDps.serv.cServ.cTribNac} />
        <Field label="Local de Prestação" value={infDps.serv.locPrest.cLocPrestacao} />
      </div>
      <div className="grid grid-cols-2">
        <Field label="Tributação Nacional" value={infNFSe.xTribNac} />
      </div>
      <div className="rounded border border-black px-[2pt] py-[1pt]">
        <div className="text-[6pt] leading-[1.1] uppercase">
          Discriminação
        </div>
        <div className="text-[6pt] mt-[1pt] whitespace-pre-wrap min-h-[50px] leading-[1.1]">
          {infDps.serv.cServ.xDescServ}
        </div>
      </div>
    </div>
  );

  const servicoValores = infDps?.valores.vServPrest.vServ || "0";
  const vLiq = infNFSe.valores.vLiq || "0";

  const valuesBlock = (
    <div>
      <SectionTitle>Valores</SectionTitle>
      <div className="grid grid-cols-4">
        <FieldRight
          label="Valor dos Serviços"
          value={formatCurrency(servicoValores)}
        />
        <FieldRight
          label="Valor Líquido NFS-e"
          value={formatCurrency(vLiq)}
          className="font-bold"
        />
      </div>
      {infDps?.valores.trib?.tribMun && (
        <div className="grid grid-cols-3">
          <FieldRight
            label="ISSQN"
            value={infDps.valores.trib.tribMun.tribISSQN === "1" ? "Tributado" : "Não Tributado"}
          />
          <FieldRight
            label="Retenção ISS"
            value={infDps.valores.trib.tribMun.tpRetISSQN === "1" ? "Retido" : "Não Retido"}
          />
          {infDps.valores.trib.totTrib?.pTotTribSN && (
            <FieldRight
              label="Total Tributos (SN)"
              value={`${infDps.valores.trib.totTrib.pTotTribSN}%`}
            />
          )}
        </div>
      )}
    </div>
  );

  const othersBlock = (
    <div>
      <SectionTitle>Informações Adicionais</SectionTitle>
      <div className="grid grid-cols-3">
        <Field label="Ambiente" value={infNFSe.ambGer === "1" ? "Produção" : "Homologação"} />
        <Field label="Status" value={statusMap[infNFSe.cStat] || infNFSe.cStat} />
        <Field label="Nº DFSe" value={infNFSe.nDFSe} />
      </div>
    </div>
  );

  const contentBlocks: ContentBlock[] = [
    { key: "header", node: headerBlock },
    { key: "provider", node: providerBlock },
    ...(customerBlock ? [{ key: "customer", node: customerBlock }] : []),
    ...(serviceBlock ? [{ key: "service", node: serviceBlock }] : []),
    { key: "values", node: valuesBlock },
    { key: "others", node: othersBlock },
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
  }, [blockKeySignature, nfse]);

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

const statusMap: Record<string, string> = {
  "100": "Autorizado",
};