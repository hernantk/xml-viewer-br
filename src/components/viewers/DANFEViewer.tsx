import type { Nfe } from "@/types/nfe";
import {
  formatCNPJorCPF,
  formatCurrency,
  formatQuantity,
  formatDate,
  formatDateTime,
  formatAccessKey,
  formatCEP,
  formatPhone,
  MODAL_FRETE,
} from "@/utils/formatters";

interface Props {
  nfe: Nfe;
}

function Field({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`border border-gray-300 dark:border-gray-600 p-1 ${className}`}>
      <div className="text-[9px] text-gray-500 dark:text-gray-400 uppercase leading-tight">
        {label}
      </div>
      <div className="text-xs font-medium leading-tight mt-0.5 break-words">
        {value || "\u00A0"}
      </div>
    </div>
  );
}

function FieldRight({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`border border-gray-300 dark:border-gray-600 p-1 ${className}`}>
      <div className="text-[9px] text-gray-500 dark:text-gray-400 uppercase leading-tight">
        {label}
      </div>
      <div className="text-xs font-medium leading-tight mt-0.5 text-right">
        {value || "\u00A0"}
      </div>
    </div>
  );
}

export function DANFEViewer({ nfe }: Props) {
  const { infNFe, protNFe } = nfe;
  const { ide, emit, dest, det, total, transp, cobr, infAdic } = infNFe;
  const accessKey = protNFe?.infProt.chNFe || infNFe.id.replace("NFe", "");

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
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {emit.xFant}
                </div>
              )}
              <div className="text-[10px] mt-1">
                {emit.enderEmit.xLgr}, {emit.enderEmit.nro}
                {emit.enderEmit.xCpl && ` - ${emit.enderEmit.xCpl}`}
              </div>
              <div className="text-[10px]">
                {emit.enderEmit.xBairro} - {emit.enderEmit.xMun}/
                {emit.enderEmit.UF}
              </div>
              <div className="text-[10px]">
                CEP: {formatCEP(emit.enderEmit.CEP)}
                {emit.enderEmit.fone && ` - Fone: ${formatPhone(emit.enderEmit.fone)}`}
              </div>
            </div>

            {/* DANFE Title */}
            <div className="border-r border-black dark:border-gray-400 p-2 text-center min-w-[140px]">
              <div className="text-lg font-bold">DANFE</div>
              <div className="text-[8px] leading-tight">
                Documento Auxiliar da
                <br />
                Nota Fiscal Eletrônica
              </div>
              <div className="mt-1 text-xs">
                <span className="font-bold">
                  {ide.tpNF === "0" ? "0 - ENTRADA" : "1 - SAÍDA"}
                </span>
              </div>
              <div className="text-[10px] mt-1">
                N.º <span className="font-bold">{ide.nNF}</span>
              </div>
              <div className="text-[10px]">
                Série <span className="font-bold">{ide.serie}</span>
              </div>
            </div>

            {/* Barcode / Access Key */}
            <div className="p-2">
              <div className="text-[9px] text-center mb-1 font-mono tracking-wider break-all">
                {formatAccessKey(accessKey)}
              </div>
              {protNFe && (
                <div className="text-[9px] mt-2">
                  <div>
                    Protocolo de Autorização:{" "}
                    <span className="font-bold">{protNFe.infProt.nProt}</span>
                  </div>
                  <div>{formatDateTime(protNFe.infProt.dhRecbto)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Nature of Operation */}
          <Field
            label="Natureza da Operação"
            value={ide.natOp}
            className="border-t border-black dark:border-gray-400"
          />

          {/* IE, IE ST, CNPJ */}
          <div className="grid grid-cols-3 border-t border-black dark:border-gray-400">
            <Field label="Inscrição Estadual" value={emit.IE} />
            <Field label="Inscrição Estadual do Subst. Tributário" value="" />
            <Field label="CNPJ" value={formatCNPJorCPF(emit.CNPJ || emit.CPF)} />
          </div>
        </div>

        {/* ===== DESTINATÁRIO / REMETENTE ===== */}
        <div className="border-2 border-t-0 border-black dark:border-gray-400">
          <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] font-bold uppercase">
            Destinatário / Remetente
          </div>
          <div className="grid grid-cols-[1fr_180px_130px]">
            <Field label="Nome / Razão Social" value={dest?.xNome || ""} />
            <Field label="CNPJ / CPF" value={formatCNPJorCPF(dest?.CNPJ || dest?.CPF)} />
            <Field label="Data de Emissão" value={formatDate(ide.dhEmi)} />
          </div>
          <div className="grid grid-cols-[1fr_200px_100px_130px]">
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
          <div className="grid grid-cols-[1fr_80px_160px_130px]">
            <Field label="Município" value={dest?.enderDest?.xMun || ""} />
            <Field label="UF" value={dest?.enderDest?.UF || ""} />
            <Field label="Fone / Fax" value={formatPhone(dest?.enderDest?.fone)} />
            <Field label="Inscrição Estadual" value={dest?.IE || ""} />
          </div>
        </div>

        {/* ===== PRODUTOS / SERVIÇOS ===== */}
        <div className="border-2 border-t-0 border-black dark:border-gray-400">
          <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] font-bold uppercase">
            Dados dos Produtos / Serviços
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-left">Código</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-left">Descrição do Produto / Serviço</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-center">NCM/SH</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-center">CST</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-center">CFOP</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-center">UN</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right">Qtd.</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right">Vlr. Unit.</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right">Vlr. Total</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right">BC ICMS</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right">Vlr. ICMS</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right">Vlr. IPI</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right">% ICMS</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right">% IPI</th>
                </tr>
              </thead>
              <tbody>
                {det.map((item) => (
                  <tr key={item.nItem} className="hover:bg-blue-50 dark:hover:bg-gray-700">
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-0.5">{item.prod.cProd}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-0.5">{item.prod.xProd}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-center">{item.prod.NCM}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-center">
                      {item.imposto.ICMS?.CST || item.imposto.ICMS?.CSOSN || ""}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-center">{item.prod.CFOP}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-center">{item.prod.uCom}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right">{formatQuantity(item.prod.qCom)}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right">{formatCurrency(item.prod.vUnCom)}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right">{formatCurrency(item.prod.vProd)}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right">{item.imposto.ICMS?.vBC ? formatCurrency(item.imposto.ICMS.vBC) : ""}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right">{item.imposto.ICMS?.vICMS ? formatCurrency(item.imposto.ICMS.vICMS) : ""}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right">{item.imposto.IPI?.vIPI ? formatCurrency(item.imposto.IPI.vIPI) : ""}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right">{item.imposto.ICMS?.pICMS || ""}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right">{item.imposto.IPI?.pIPI || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== TOTAIS ===== */}
        <div className="border-2 border-t-0 border-black dark:border-gray-400">
          <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] font-bold uppercase">
            Cálculo do Imposto
          </div>
          <div className="grid grid-cols-5">
            <FieldRight label="Base de Cálculo do ICMS" value={formatCurrency(total.ICMSTot.vBC)} />
            <FieldRight label="Valor do ICMS" value={formatCurrency(total.ICMSTot.vICMS)} />
            <FieldRight label="Base de Cálculo ICMS ST" value={formatCurrency(total.ICMSTot.vBCST)} />
            <FieldRight label="Valor do ICMS ST" value={formatCurrency(total.ICMSTot.vST)} />
            <FieldRight label="Valor Total dos Produtos" value={formatCurrency(total.ICMSTot.vProd)} />
          </div>
          <div className="grid grid-cols-6">
            <FieldRight label="Valor do Frete" value={formatCurrency(total.ICMSTot.vFrete)} />
            <FieldRight label="Valor do Seguro" value={formatCurrency(total.ICMSTot.vSeg)} />
            <FieldRight label="Desconto" value={formatCurrency(total.ICMSTot.vDesc)} />
            <FieldRight label="Outras Despesas" value={formatCurrency(total.ICMSTot.vOutro)} />
            <FieldRight label="Valor do IPI" value={formatCurrency(total.ICMSTot.vIPI)} />
            <FieldRight label="Valor Total da NF" value={formatCurrency(total.ICMSTot.vNF)} className="font-bold" />
          </div>
        </div>

        {/* ===== TRANSPORTADOR ===== */}
        <div className="border-2 border-t-0 border-black dark:border-gray-400">
          <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] font-bold uppercase">
            Transportador / Volumes Transportados
          </div>
          <div className="grid grid-cols-[1fr_1fr_150px_80px_100px_80px]">
            <Field
              label="Modalidade do Frete"
              value={MODAL_FRETE[transp.modFrete] || transp.modFrete}
            />
            <Field label="Nome / Razão Social" value={transp.transporta?.xNome || ""} />
            <Field label="CNPJ / CPF" value={formatCNPJorCPF(transp.transporta?.CNPJ || transp.transporta?.CPF)} />
            <Field label="IE" value={transp.transporta?.IE || ""} />
            <Field label="Município" value={transp.transporta?.xMun || ""} />
            <Field label="UF" value={transp.transporta?.UF || ""} />
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

        {/* ===== COBRANÇA ===== */}
        {cobr && cobr.dup && cobr.dup.length > 0 && (
          <div className="border-2 border-t-0 border-black dark:border-gray-400">
            <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] font-bold uppercase">
              Dados da Cobrança
            </div>
            {cobr.fat && (
              <div className="grid grid-cols-4">
                <Field label="Número da Fatura" value={cobr.fat.nFat || ""} />
                <FieldRight label="Valor Original" value={cobr.fat.vOrig ? formatCurrency(cobr.fat.vOrig) : ""} />
                <FieldRight label="Valor do Desconto" value={cobr.fat.vDesc ? formatCurrency(cobr.fat.vDesc) : ""} />
                <FieldRight label="Valor Líquido" value={cobr.fat.vLiq ? formatCurrency(cobr.fat.vLiq) : ""} />
              </div>
            )}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8">
              {cobr.dup.map((dup) => (
                <div
                  key={dup.nDup}
                  className="border border-gray-300 dark:border-gray-600 p-1 text-[9px]"
                >
                  <div className="font-medium">Nº {dup.nDup}</div>
                  <div>{formatDate(dup.dVenc)}</div>
                  <div className="text-right font-bold">
                    {formatCurrency(dup.vDup)}
                  </div>
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
              <div className="text-[9px] text-gray-500 dark:text-gray-400 uppercase">
                Informações Complementares
              </div>
              <div className="text-[9px] mt-0.5 whitespace-pre-wrap min-h-[40px]">
                {infAdic?.infCpl || "\u00A0"}
              </div>
            </div>
            <div className="border border-gray-300 dark:border-gray-600 p-1">
              <div className="text-[9px] text-gray-500 dark:text-gray-400 uppercase">
                Informações de Interesse do Fisco
              </div>
              <div className="text-[9px] mt-0.5 whitespace-pre-wrap min-h-[40px]">
                {infAdic?.infAdFisco || "\u00A0"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
