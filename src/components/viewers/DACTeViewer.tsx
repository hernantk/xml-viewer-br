import type { Cte } from "@/types/cte";
import {
  formatCNPJorCPF,
  formatCurrency,
  formatQuantity,
  formatDate,
  formatDateTime,
  formatAccessKey,
  formatPhone,
  MODAL_TRANSPORTE,
} from "@/utils/formatters";

interface Props {
  cte: Cte;
}

function Field({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`border border-gray-300 dark:border-gray-600 p-1 ${className}`}>
      <div className="text-[9px] text-gray-500 dark:text-gray-400 uppercase leading-tight">{label}</div>
      <div className="text-xs font-medium leading-tight mt-0.5 break-words">{value || "\u00A0"}</div>
    </div>
  );
}

function FieldRight({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-300 dark:border-gray-600 p-1">
      <div className="text-[9px] text-gray-500 dark:text-gray-400 uppercase leading-tight">{label}</div>
      <div className="text-xs font-medium leading-tight mt-0.5 text-right">{value || "\u00A0"}</div>
    </div>
  );
}

function PartyBlock({ title, party }: { title: string; party?: { CNPJ?: string; CPF?: string; xNome: string; IE?: string; endereco: { xLgr: string; nro: string; xBairro: string; xMun: string; UF: string; CEP: string }; fone?: string } }) {
  if (!party) return null;
  return (
    <div className="border-2 border-t-0 border-black dark:border-gray-400">
      <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] font-bold uppercase">{title}</div>
      <div className="grid grid-cols-[1fr_180px_130px]">
        <Field label="Nome / Razão Social" value={party.xNome} />
        <Field label="CNPJ / CPF" value={formatCNPJorCPF(party.CNPJ || party.CPF)} />
        <Field label="IE" value={party.IE || ""} />
      </div>
      <div className="grid grid-cols-[1fr_150px_80px_130px]">
        <Field
          label="Endereço"
          value={`${party.endereco.xLgr}, ${party.endereco.nro}`}
        />
        <Field label="Município" value={party.endereco.xMun} />
        <Field label="UF" value={party.endereco.UF} />
        <Field label="Fone" value={party.fone ? formatPhone(party.fone) : ""} />
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
      <div className="p-4 space-y-0">
        {/* ===== HEADER ===== */}
        <div className="border-2 border-black dark:border-gray-400">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-0">
            {/* Emitente */}
            <div className="border-r border-black dark:border-gray-400 p-2">
              <div className="text-sm font-bold">{emit.xNome}</div>
              {emit.xFant && (
                <div className="text-xs text-gray-600 dark:text-gray-400">{emit.xFant}</div>
              )}
              <div className="text-[10px] mt-1">
                {emit.enderEmit.xLgr}, {emit.enderEmit.nro}
              </div>
              <div className="text-[10px]">
                {emit.enderEmit.xBairro} - {emit.enderEmit.xMun}/{emit.enderEmit.UF}
              </div>
              <div className="text-[10px]">
                CNPJ: {formatCNPJorCPF(emit.CNPJ)} - IE: {emit.IE}
              </div>
            </div>

            {/* DACTe Title */}
            <div className="border-r border-black dark:border-gray-400 p-2 text-center min-w-[140px]">
              <div className="text-lg font-bold">DACTE</div>
              <div className="text-[8px] leading-tight">
                Documento Auxiliar do
                <br />
                Conhecimento de Transporte
                <br />
                Eletrônico
              </div>
              <div className="mt-1 text-[10px]">
                CT-e N.º <span className="font-bold">{ide.nCT}</span>
              </div>
              <div className="text-[10px]">
                Série <span className="font-bold">{ide.serie}</span>
              </div>
              <div className="text-[10px] mt-1">
                Modal: <span className="font-bold">{MODAL_TRANSPORTE[ide.modal] || ide.modal}</span>
              </div>
            </div>

            {/* Access Key */}
            <div className="p-2">
              <div className="text-[9px] text-center font-mono tracking-wider break-all">
                {formatAccessKey(accessKey)}
              </div>
              {protCTe && (
                <div className="text-[9px] mt-2">
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
        <div className="border-2 border-t-0 border-black dark:border-gray-400">
          <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] font-bold uppercase">
            Valores da Prestação do Serviço
          </div>
          <div className="grid grid-cols-3">
            <FieldRight label="Valor Total da Prestação" value={formatCurrency(vPrest.vTPrest)} />
            <FieldRight label="Valor a Receber" value={formatCurrency(vPrest.vRec)} />
            <div className="border border-gray-300 dark:border-gray-600 p-1">
              <div className="text-[9px] text-gray-500 dark:text-gray-400 uppercase">Componentes</div>
              {vPrest.comp?.map((c, i) => (
                <div key={i} className="text-[9px] flex justify-between">
                  <span>{c.xNome}</span>
                  <span className="font-medium">{formatCurrency(c.vComp)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== IMPOSTOS ===== */}
        <div className="border-2 border-t-0 border-black dark:border-gray-400">
          <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] font-bold uppercase">
            Informações relativas ao Imposto
          </div>
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
          <div className="border-2 border-t-0 border-black dark:border-gray-400">
            <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] font-bold uppercase">
              Informações da Carga
            </div>
            <div className="grid grid-cols-3">
              <Field label="Produto Predominante" value={infCTeNorm.infCarga.proPred} />
              <FieldRight label="Valor da Carga" value={infCTeNorm.infCarga.vCarga ? formatCurrency(infCTeNorm.infCarga.vCarga) : ""} />
              <div className="border border-gray-300 dark:border-gray-600 p-1">
                <div className="text-[9px] text-gray-500 dark:text-gray-400 uppercase">Quantidades</div>
                {infCTeNorm.infCarga.infQ.map((q, i) => (
                  <div key={i} className="text-[9px] flex justify-between">
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
          <div className="border-2 border-t-0 border-black dark:border-gray-400">
            <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] font-bold uppercase">
              Documentos Originários
            </div>
            <div className="p-1 space-y-0.5">
              {infCTeNorm.infDoc.infNFe.map((nf, i) => (
                <div key={i} className="text-[9px] font-mono">
                  NF-e: {formatAccessKey(nf.chave)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== INFORMAÇÕES ADICIONAIS ===== */}
        <div className="border-2 border-t-0 border-black dark:border-gray-400">
          <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] font-bold uppercase">
            Dados Adicionais
          </div>
          <div className="grid grid-cols-2">
            <div className="border border-gray-300 dark:border-gray-600 p-1">
              <div className="text-[9px] text-gray-500 dark:text-gray-400 uppercase">Informações Complementares</div>
              <div className="text-[9px] mt-0.5 whitespace-pre-wrap min-h-[30px]">
                {infAdic?.infCpl || "\u00A0"}
              </div>
            </div>
            <div className="border border-gray-300 dark:border-gray-600 p-1">
              <div className="text-[9px] text-gray-500 dark:text-gray-400 uppercase">Informações do Fisco</div>
              <div className="text-[9px] mt-0.5 whitespace-pre-wrap min-h-[30px]">
                {infAdic?.infAdFisco || "\u00A0"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
