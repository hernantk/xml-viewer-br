import { useRef, useEffect } from "react";
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
  MODAL_TRANSPORTE,
} from "@/utils/formatters";

interface Props {
  cte: Cte;
}

function Field({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`border border-gray-300 dark:border-gray-600 px-1 py-0.5 ${className}`}>
      <div className="text-[7px] text-gray-500 dark:text-gray-400 uppercase leading-tight">{label}</div>
      <div className="text-[10px] font-medium leading-tight break-words">{value || "\u00A0"}</div>
    </div>
  );
}

function FieldRight({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`border border-gray-300 dark:border-gray-600 px-1 py-0.5 ${className}`}>
      <div className="text-[7px] text-gray-500 dark:text-gray-400 uppercase leading-tight">{label}</div>
      <div className="text-[10px] font-medium leading-tight text-right">{value || "\u00A0"}</div>
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

  return <svg ref={svgRef} className="w-full" />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide border-b border-gray-300 dark:border-gray-600">
      {children}
    </div>
  );
}

function PartyBlock({ title, party }: { title: string; party?: { CNPJ?: string; CPF?: string; xNome: string; IE?: string; endereco: { xLgr: string; nro: string; xBairro: string; xMun: string; UF: string; CEP: string }; fone?: string } }) {
  if (!party) return null;
  return (
    <div className="border border-t-0 border-black dark:border-gray-400">
      <SectionTitle>{title}</SectionTitle>
      <div className="grid grid-cols-[1fr_170px_130px]">
        <Field label="Nome / Razão Social" value={party.xNome} />
        <Field label="CNPJ / CPF" value={formatCNPJorCPF(party.CNPJ || party.CPF)} />
        <Field label="IE" value={party.IE || ""} />
      </div>
      <div className="grid grid-cols-[1fr_150px_60px_120px]">
        <Field
          label="Endereço"
          value={`${party.endereco.xLgr}, ${party.endereco.nro}`}
        />
        <Field label="Município" value={party.endereco.xMun} />
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
  const { ide, emit, rem, exped, receb, dest, vPrest, imp, infCTeNorm, infAdic } = infCte;
  const accessKey = protCTe?.infProt.chCTe || infCte.id.replace("CTe", "");

  return (
    <div className="max-w-[210mm] mx-auto my-4 bg-white dark:bg-gray-900 shadow-lg print:shadow-none print:my-0">
      <div className="p-4 text-black dark:text-gray-100">

        {/* ===== CANHOTO ===== */}
        <div className="border border-black dark:border-gray-400">
          <div className="grid grid-cols-[1fr_auto] gap-0">
            <div className="border-r border-black dark:border-gray-400 p-1.5">
              <div className="text-[8px] leading-snug">
                RECEBEMOS DE <span className="font-bold">{emit.xNome}</span> OS SERVIÇOS CONSTANTES DO CONHECIMENTO DE TRANSPORTE ELETRÔNICO INDICADO AO LADO.
              </div>
              <div className="grid grid-cols-2 mt-1.5 border-t border-gray-300 dark:border-gray-600 pt-1">
                <Field label="Data de Recebimento" value="" />
                <Field label="Identificação e Assinatura do Recebedor" value="" />
              </div>
            </div>
            <div className="p-2 text-center min-w-[110px] flex flex-col justify-center">
              <div className="text-base font-bold">CT-e</div>
              <div className="text-[9px] mt-0.5">
                N.º <span className="font-bold">{ide.nCT}</span>
              </div>
              <div className="text-[9px]">
                Série <span className="font-bold">{ide.serie}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashed separator */}
        <div className="border-b border-dashed border-gray-400 dark:border-gray-500 my-1.5" />

        {/* ===== HEADER ===== */}
        <div className="border border-black dark:border-gray-400">
          <div className="grid grid-cols-[1fr_140px_1fr] gap-0">
            {/* Emitente */}
            <div className="border-r border-black dark:border-gray-400 p-2 flex flex-col justify-center">
              <div className="text-xs font-bold leading-tight">{emit.xNome}</div>
              {emit.xFant && (
                <div className="text-[9px] text-gray-600 dark:text-gray-400">{emit.xFant}</div>
              )}
              <div className="text-[9px] mt-1 leading-snug">
                {emit.enderEmit.xLgr}, {emit.enderEmit.nro}
              </div>
              <div className="text-[9px] leading-snug">
                {emit.enderEmit.xBairro} - {emit.enderEmit.xMun}/{emit.enderEmit.UF}
              </div>
              <div className="text-[9px] leading-snug">
                CNPJ: {formatCNPJorCPF(emit.CNPJ)} - IE: {emit.IE}
              </div>
            </div>

            {/* DACTE Title */}
            <div className="border-r border-black dark:border-gray-400 p-2 text-center flex flex-col items-center justify-center">
              <div className="text-lg font-bold tracking-wider">DACTE</div>
              <div className="text-[7px] leading-tight text-gray-600 dark:text-gray-400">
                Documento Auxiliar do
                <br />
                Conhecimento de Transporte
                <br />
                Eletrônico
              </div>
              <div className="mt-1 text-[9px]">
                CT-e N.º <span className="font-bold">{ide.nCT}</span>
              </div>
              <div className="text-[9px]">
                Série <span className="font-bold">{ide.serie}</span>
              </div>
              <div className="text-[9px] mt-1">
                Modal: <span className="font-bold">{MODAL_TRANSPORTE[ide.modal] || ide.modal}</span>
              </div>
            </div>

            {/* Barcode & Access Key */}
            <div className="p-2 flex flex-col items-center justify-between">
              <div className="w-full px-2">
                <Barcode value={accessKey} />
              </div>
              <div className="text-[8px] text-center font-mono tracking-wider break-all mt-1">
                {formatAccessKey(accessKey)}
              </div>
              <div className="text-[7px] text-center text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                Consulta de autenticidade no portal nacional do CT-e
                <br />
                www.cte.fazenda.gov.br/portal
              </div>
              {protCTe && (
                <div className="text-[8px] text-center mt-1 leading-snug">
                  <div>
                    Protocolo: <span className="font-bold">{protCTe.infProt.nProt}</span>
                  </div>
                  <div>{formatDateTime(protCTe.infProt.dhRecbto)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Emission info */}
          <div className="grid grid-cols-4 border-t border-black dark:border-gray-400">
            <Field label="CFOP" value={`${ide.CFOP} - ${ide.natOp}`} />
            <Field label="Data de Emissão" value={formatDate(ide.dhEmi)} />
            <Field label="Origem" value={`${ide.xMunIni}/${ide.UFIni}`} />
            <Field label="Destino" value={`${ide.xMunFim}/${ide.UFFim}`} />
          </div>
        </div>

        {/* ===== PARTES ===== */}
        <PartyBlock title="Remetente" party={rem} />
        <PartyBlock title="Destinatário" party={dest} />
        <PartyBlock title="Expedidor" party={exped} />
        <PartyBlock title="Recebedor" party={receb} />

        {/* ===== VALORES DA PRESTAÇÃO ===== */}
        <div className="border border-t-0 border-black dark:border-gray-400">
          <SectionTitle>Valores da Prestação do Serviço</SectionTitle>
          <div className="grid grid-cols-3">
            <FieldRight label="Valor Total da Prestação" value={formatCurrency(vPrest.vTPrest)} />
            <FieldRight label="Valor a Receber" value={formatCurrency(vPrest.vRec)} />
            <div className="border border-gray-300 dark:border-gray-600 px-1 py-0.5">
              <div className="text-[7px] text-gray-500 dark:text-gray-400 uppercase">Componentes</div>
              {vPrest.comp?.map((c, i) => (
                <div key={i} className="text-[8px] flex justify-between">
                  <span>{c.xNome}</span>
                  <span className="font-medium">{formatCurrency(c.vComp)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== IMPOSTOS ===== */}
        <div className="border border-t-0 border-black dark:border-gray-400">
          <SectionTitle>Informações Relativas ao Imposto</SectionTitle>
          <div className="grid grid-cols-5">
            <Field label="Situação Tributária" value={imp.ICMS.CST} />
            <FieldRight label="Base de Cálculo" value={imp.ICMS.vBC ? formatCurrency(imp.ICMS.vBC) : ""} />
            <FieldRight label="Alíquota" value={imp.ICMS.pICMS ? `${imp.ICMS.pICMS}%` : ""} />
            <FieldRight label="Valor do ICMS" value={imp.ICMS.vICMS ? formatCurrency(imp.ICMS.vICMS) : ""} />
            <FieldRight label="Valor Total dos Tributos" value={imp.vTotTrib ? formatCurrency(imp.vTotTrib) : ""} />
          </div>
        </div>

        {/* ===== CARGA ===== */}
        {infCTeNorm && (
          <div className="border border-t-0 border-black dark:border-gray-400">
            <SectionTitle>Informações da Carga</SectionTitle>
            <div className="grid grid-cols-3">
              <Field label="Produto Predominante" value={infCTeNorm.infCarga.proPred} />
              <FieldRight label="Valor da Carga" value={infCTeNorm.infCarga.vCarga ? formatCurrency(infCTeNorm.infCarga.vCarga) : ""} />
              <div className="border border-gray-300 dark:border-gray-600 px-1 py-0.5">
                <div className="text-[7px] text-gray-500 dark:text-gray-400 uppercase">Quantidades</div>
                {infCTeNorm.infCarga.infQ.map((q, i) => (
                  <div key={i} className="text-[8px] flex justify-between">
                    <span>{q.tpMed}</span>
                    <span className="font-medium">{formatQuantity(q.qCarga)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== DOCUMENTOS ORIGINÁRIOS ===== */}
        {infCTeNorm?.infDoc?.infNFe && infCTeNorm.infDoc.infNFe.length > 0 && (
          <div className="border border-t-0 border-black dark:border-gray-400">
            <SectionTitle>Documentos Originários</SectionTitle>
            <div className="px-1 py-0.5 space-y-0.5">
              {infCTeNorm.infDoc.infNFe.map((nf, i) => (
                <div key={i} className="text-[8px] font-mono">
                  NF-e: {formatAccessKey(nf.chave)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== INFORMAÇÕES ADICIONAIS ===== */}
        <div className="border border-t-0 border-black dark:border-gray-400">
          <SectionTitle>Dados Adicionais</SectionTitle>
          <div className="grid grid-cols-2">
            <div className="border border-gray-300 dark:border-gray-600 px-1 py-0.5">
              <div className="text-[7px] text-gray-500 dark:text-gray-400 uppercase">Informações Complementares</div>
              <div className="text-[8px] mt-0.5 whitespace-pre-wrap min-h-[40px]">
                {infAdic?.infCpl || "\u00A0"}
              </div>
            </div>
            <div className="border border-gray-300 dark:border-gray-600 px-1 py-0.5">
              <div className="text-[7px] text-gray-500 dark:text-gray-400 uppercase">Reservado ao Fisco</div>
              <div className="text-[8px] mt-0.5 whitespace-pre-wrap min-h-[40px]">
                {infAdic?.infAdFisco || "\u00A0"}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
