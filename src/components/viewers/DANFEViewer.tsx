import { useRef, useEffect } from "react";
import JsBarcode from "jsbarcode";
import type { Nfe } from "@/types/nfe";
import {
  formatCNPJorCPF,
  formatCurrency,
  formatQuantity,
  formatDate,
  formatDateTime,
  formatTime,
  formatAccessKey,
  formatCEP,
  formatPhone,
  formatNFNumber,
  MODAL_FRETE,
} from "@/utils/formatters";

interface Props {
  nfe: Nfe;
}

function Field({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`border border-gray-300 dark:border-gray-600 px-1 py-0.5 ${className}`}>
      <div className="text-[7px] text-gray-500 dark:text-gray-400 uppercase leading-tight">
        {label}
      </div>
      <div className="text-[10px] font-medium leading-tight break-words">
        {value || "\u00A0"}
      </div>
    </div>
  );
}

function FieldRight({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`border border-gray-300 dark:border-gray-600 px-1 py-0.5 ${className}`}>
      <div className="text-[7px] text-gray-500 dark:text-gray-400 uppercase leading-tight">
        {label}
      </div>
      <div className="text-[10px] font-medium leading-tight text-right">
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
        // Fallback: barcode generation failed
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

export function DANFEViewer({ nfe }: Props) {
  const { infNFe, protNFe } = nfe;
  const { ide, emit, dest, det, total, transp, cobr, infAdic } = infNFe;
  const accessKey = protNFe?.infProt.chNFe || infNFe.id.replace("NFe", "");

  return (
    <div className="max-w-[210mm] mx-auto my-4 bg-white dark:bg-gray-900 shadow-lg print:shadow-none print:my-0">
      <div className="p-4 text-black dark:text-gray-100">

        {/* ===== CANHOTO (Recibo) ===== */}
        <div className="border border-black dark:border-gray-400">
          <div className="grid grid-cols-[1fr_auto] gap-0">
            <div className="border-r border-black dark:border-gray-400 p-1.5">
              <div className="text-[8px] leading-snug">
                RECEBEMOS DE <span className="font-bold">{emit.xNome}</span> OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO.
                {dest?.xNome && (
                  <> NOTA FISCAL Nº {formatNFNumber(ide.nNF)} SÉRIE {ide.serie}{" "}
                    {det.length} {det.length === 1 ? "ITEM" : "ITENS"}{" "}
                    DESTINATÁRIO: {dest.xNome}
                    {dest.enderDest && (
                      <> - {dest.enderDest.xLgr} Nº {dest.enderDest.nro} {dest.enderDest.xBairro} {dest.enderDest.xMun}, {dest.enderDest.UF}</>
                    )}
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 mt-1.5 border-t border-gray-300 dark:border-gray-600 pt-1">
                <Field label="Data de Recebimento" value="" />
                <Field label="Identificação e Assinatura do Recebedor" value="" />
              </div>
            </div>
            <div className="p-2 text-center min-w-[110px] flex flex-col justify-center">
              <div className="text-base font-bold">NF-e</div>
              <div className="text-[9px] mt-0.5">
                N.º <span className="font-bold">{formatNFNumber(ide.nNF)}</span>
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
                <div className="text-[9px] text-gray-600 dark:text-gray-400">
                  {emit.xFant}
                </div>
              )}
              <div className="text-[9px] mt-1 leading-snug">
                {emit.enderEmit.xLgr}, {emit.enderEmit.nro}
                {emit.enderEmit.xCpl && ` - ${emit.enderEmit.xCpl}`}
              </div>
              <div className="text-[9px] leading-snug">
                {emit.enderEmit.xBairro} - {emit.enderEmit.xMun}/{emit.enderEmit.UF}
              </div>
              <div className="text-[9px] leading-snug">
                CEP: {formatCEP(emit.enderEmit.CEP)}
                {emit.enderEmit.fone && ` - Fone: ${formatPhone(emit.enderEmit.fone)}`}
              </div>
            </div>

            {/* DANFE Title */}
            <div className="border-r border-black dark:border-gray-400 p-2 text-center flex flex-col items-center justify-center">
              <div className="text-lg font-bold tracking-wider">DANFE</div>
              <div className="text-[7px] leading-tight text-gray-600 dark:text-gray-400">
                Documento Auxiliar da
                <br />
                Nota Fiscal Eletrônica
              </div>
              <div className="mt-1 text-[9px] font-bold">
                {ide.tpNF === "0" ? "0 - ENTRADA" : "1 - SAÍDA"}
              </div>
              <div className="text-[9px] mt-1">
                N.º <span className="font-bold">{formatNFNumber(ide.nNF)}</span>
              </div>
              <div className="text-[9px]">
                Série <span className="font-bold">{ide.serie}</span>
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
                Consulta de autenticidade no portal nacional da NF-e
                <br />
                www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora
              </div>
              {protNFe && (
                <div className="text-[8px] text-center mt-1 leading-snug">
                  <div>
                    Protocolo de Autorização:{" "}
                    <span className="font-bold">{protNFe.infProt.nProt}</span>
                  </div>
                  <div>{formatDateTime(protNFe.infProt.dhRecbto)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Natureza da Operação */}
          <div className="border-t border-black dark:border-gray-400">
            <Field label="Natureza da Operação" value={ide.natOp} />
          </div>

          {/* IE, IE ST, CNPJ */}
          <div className="grid grid-cols-3 border-t border-black dark:border-gray-400">
            <Field label="Inscrição Estadual" value={emit.IE} />
            <Field label="Inscrição Estadual do Subst. Tributário" value="" />
            <Field label="CNPJ" value={formatCNPJorCPF(emit.CNPJ || emit.CPF)} />
          </div>
        </div>

        {/* ===== DESTINATÁRIO / REMETENTE ===== */}
        <div className="border border-t-0 border-black dark:border-gray-400">
          <SectionTitle>Destinatário / Remetente</SectionTitle>
          <div className="grid grid-cols-[1fr_170px_120px]">
            <Field label="Nome / Razão Social" value={dest?.xNome || ""} />
            <Field label="CNPJ / CPF" value={formatCNPJorCPF(dest?.CNPJ || dest?.CPF)} />
            <Field label="Data de Emissão" value={formatDate(ide.dhEmi)} />
          </div>
          <div className="grid grid-cols-[1fr_170px_100px_120px]">
            <Field
              label="Endereço"
              value={
                dest?.enderDest
                  ? `${dest.enderDest.xLgr}, ${dest.enderDest.nro}${dest.enderDest.xCpl ? ` - ${dest.enderDest.xCpl}` : ""}`
                  : ""
              }
            />
            <Field label="Bairro / Distrito" value={dest?.enderDest?.xBairro || ""} />
            <Field label="CEP" value={dest?.enderDest?.CEP ? formatCEP(dest.enderDest.CEP) : ""} />
            <Field label="Data Saída/Entrada" value={ide.dhSaiEnt ? formatDate(ide.dhSaiEnt) : ""} />
          </div>
          <div className="grid grid-cols-[1fr_60px_140px_140px_100px]">
            <Field label="Município" value={dest?.enderDest?.xMun || ""} />
            <Field label="UF" value={dest?.enderDest?.UF || ""} />
            <Field label="Fone / Fax" value={formatPhone(dest?.enderDest?.fone)} />
            <Field label="Inscrição Estadual" value={dest?.IE || ""} />
            <Field label="Hora de Saída" value={ide.dhSaiEnt ? formatTime(ide.dhSaiEnt) : ""} />
          </div>
        </div>

        {/* ===== FATURA / DUPLICATA ===== */}
        {cobr && (cobr.fat || (cobr.dup && cobr.dup.length > 0)) && (
          <div className="border border-t-0 border-black dark:border-gray-400">
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
                  <div
                    key={dup.nDup}
                    className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-[8px]"
                  >
                    <div className="font-medium">Nº {dup.nDup}</div>
                    <div>{formatDate(dup.dVenc)}</div>
                    <div className="text-right font-bold">{formatCurrency(dup.vDup)}</div>
                  </div>
                ))}
              </div>
            )}
            {cobr.dup && cobr.dup.length > 20 && (
              <div className="px-2 py-1 text-[8px] text-gray-600 dark:text-gray-400">
                Existem mais de {cobr.dup.length} duplicatas registradas, portanto não serão exibidas, confira diretamente pelo XML.
              </div>
            )}
          </div>
        )}

        {/* ===== CÁLCULO DO IMPOSTO ===== */}
        <div className="border border-t-0 border-black dark:border-gray-400">
          <SectionTitle>Cálculo do Imposto</SectionTitle>
          <div className="grid grid-cols-7">
            <FieldRight label="Base de Cálc. do ICMS" value={formatCurrency(total.ICMSTot.vBC)} />
            <FieldRight label="Valor do ICMS" value={formatCurrency(total.ICMSTot.vICMS)} />
            <FieldRight label="Base de Cálc. ICMS ST" value={formatCurrency(total.ICMSTot.vBCST)} />
            <FieldRight label="Valor do ICMS Subst." value={formatCurrency(total.ICMSTot.vST)} />
            <FieldRight label="V. Imp. Importação" value={formatCurrency(total.ICMSTot.vII)} />
            <FieldRight label="Valor do PIS" value={formatCurrency(total.ICMSTot.vPIS)} />
            <FieldRight label="V. Total dos Produtos" value={formatCurrency(total.ICMSTot.vProd)} />
          </div>
          <div className="grid grid-cols-7">
            <FieldRight label="Valor do Frete" value={formatCurrency(total.ICMSTot.vFrete)} />
            <FieldRight label="Valor do Seguro" value={formatCurrency(total.ICMSTot.vSeg)} />
            <FieldRight label="Desconto" value={formatCurrency(total.ICMSTot.vDesc)} />
            <FieldRight label="Outras Desp. Acess." value={formatCurrency(total.ICMSTot.vOutro)} />
            <FieldRight label="Valor do IPI" value={formatCurrency(total.ICMSTot.vIPI)} />
            <FieldRight label="V. Aprox. dos Tributos" value={total.ICMSTot.vTotTrib ? formatCurrency(total.ICMSTot.vTotTrib) : ""} />
            <FieldRight label="Valor Total da Nota" value={formatCurrency(total.ICMSTot.vNF)} className="font-bold" />
          </div>
        </div>

        {/* ===== TRANSPORTADOR / VOLUMES ===== */}
        <div className="border border-t-0 border-black dark:border-gray-400">
          <SectionTitle>Transportador / Volumes Transportados</SectionTitle>
          <div className="grid grid-cols-[1fr_auto_150px]">
            <Field label="Nome / Razão Social" value={transp.transporta?.xNome || ""} />
            <Field
              label="Frete por Conta"
              value={MODAL_FRETE[transp.modFrete] || transp.modFrete}
              className="min-w-[180px]"
            />
            <Field label="CNPJ / CPF" value={formatCNPJorCPF(transp.transporta?.CNPJ || transp.transporta?.CPF)} />
          </div>
          <div className="grid grid-cols-[1fr_180px_60px_180px]">
            <Field label="Endereço" value={transp.transporta?.xEnder || ""} />
            <Field label="Município" value={transp.transporta?.xMun || ""} />
            <Field label="UF" value={transp.transporta?.UF || ""} />
            <Field label="Inscrição Estadual" value={transp.transporta?.IE || ""} />
          </div>
          {transp.vol && transp.vol.length > 0 && (
            <div className="grid grid-cols-6">
              <Field label="Quantidade" value={transp.vol[0]?.qVol || ""} />
              <Field label="Espécie" value={transp.vol[0]?.esp || ""} />
              <Field label="Marca" value={transp.vol[0]?.marca || ""} />
              <Field label="Numeração" value={transp.vol[0]?.nVol || ""} />
              <FieldRight label="Peso Bruto" value={transp.vol[0]?.pesoB ? formatQuantity(transp.vol[0].pesoB) : ""} />
              <FieldRight label="Peso Líquido" value={transp.vol[0]?.pesoL ? formatQuantity(transp.vol[0].pesoL) : ""} />
            </div>
          )}
        </div>

        {/* ===== DADOS DOS PRODUTOS / SERVIÇOS ===== */}
        <div className="border border-t-0 border-black dark:border-gray-400">
          <SectionTitle>Dados dos Produtos / Serviços</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-[8px] border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-left font-semibold">Código</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-left font-semibold">Descrição do Produto / Serviço</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-center font-semibold">NCM/SH</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-center font-semibold">CST</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-center font-semibold">CFOP</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-center font-semibold">UN</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-right font-semibold">Quant.</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-right font-semibold">Vlr. Unit.</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-right font-semibold">Vlr. Total</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-right font-semibold">BC ICMS</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-right font-semibold">Vlr. ICMS</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-right font-semibold">Vlr. IPI</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-right font-semibold">% ICMS</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-right font-semibold">% IPI</th>
                </tr>
              </thead>
              <tbody>
                {det.map((item) => (
                  <tr key={item.nItem}>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 align-top">{item.prod.cProd}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 align-top">{item.prod.xProd}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-center align-top">{item.prod.NCM}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-center align-top">
                      {item.imposto.ICMS?.CST || item.imposto.ICMS?.CSOSN || ""}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-center align-top">{item.prod.CFOP}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-center align-top">{item.prod.uCom}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-right align-top">{formatQuantity(item.prod.qCom)}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-right align-top">{formatCurrency(item.prod.vUnCom)}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-right align-top">{formatCurrency(item.prod.vProd)}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-right align-top">{item.imposto.ICMS?.vBC ? formatCurrency(item.imposto.ICMS.vBC) : ""}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-right align-top">{item.imposto.ICMS?.vICMS ? formatCurrency(item.imposto.ICMS.vICMS) : ""}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-right align-top">{item.imposto.IPI?.vIPI ? formatCurrency(item.imposto.IPI.vIPI) : ""}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-right align-top">{item.imposto.ICMS?.pICMS || ""}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 py-0.5 text-right align-top">{item.imposto.IPI?.pIPI || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== DADOS ADICIONAIS ===== */}
        <div className="border border-t-0 border-black dark:border-gray-400">
          <SectionTitle>Dados Adicionais</SectionTitle>
          <div className="grid grid-cols-2">
            <div className="border border-gray-300 dark:border-gray-600 px-1 py-0.5">
              <div className="text-[7px] text-gray-500 dark:text-gray-400 uppercase">
                Informações Complementares
              </div>
              <div className="text-[8px] mt-0.5 whitespace-pre-wrap min-h-[50px]">
                {infAdic?.infCpl || "\u00A0"}
              </div>
            </div>
            <div className="border border-gray-300 dark:border-gray-600 px-1 py-0.5">
              <div className="text-[7px] text-gray-500 dark:text-gray-400 uppercase">
                Reservado ao Fisco
              </div>
              <div className="text-[8px] mt-0.5 whitespace-pre-wrap min-h-[50px]">
                {infAdic?.infAdFisco || "\u00A0"}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
