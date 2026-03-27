import type { CompNfse } from "@/types/nfse";
import { formatCNPJorCPF, formatCurrency, formatDate } from "@/utils/formatters";

interface Props {
  nfse: CompNfse;
}

function Field({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`border border-gray-300 dark:border-gray-600 p-1 ${className}`}>
      <div className="text-[9px] text-gray-500 dark:text-gray-400 uppercase leading-tight">{label}</div>
      <div className="text-xs font-medium leading-tight mt-0.5 break-words">{value || "\u00A0"}</div>
    </div>
  );
}

function FieldRight({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`border border-gray-300 dark:border-gray-600 p-1 ${className}`}>
      <div className="text-[9px] text-gray-500 dark:text-gray-400 uppercase leading-tight">{label}</div>
      <div className="text-xs font-medium leading-tight mt-0.5 text-right">{value || "\u00A0"}</div>
    </div>
  );
}

export function NFSeViewer({ nfse }: Props) {
  const { infNfse } = nfse.nfse;
  const prestador = infNfse.prestadorServico;
  const tomador = infNfse.tomadorServico;
  const dps = infNfse.declaracaoPrestacaoServico;
  const servico = dps?.infDeclaracaoPrestacaoServico.servico;
  const valores = servico?.valores;

  return (
    <div className="max-w-[210mm] mx-auto my-4 bg-white dark:bg-gray-900 shadow-lg print:shadow-none print:my-0">
      <div className="p-4 space-y-0">
        {/* ===== HEADER ===== */}
        <div className="border-2 border-black dark:border-gray-400">
          <div className="p-3 text-center">
            <div className="text-lg font-bold">NOTA FISCAL DE SERVIÇO ELETRÔNICA - NFS-e</div>
            <div className="grid grid-cols-3 mt-2">
              <Field label="Número da NFS-e" value={infNfse.numero} />
              <Field label="Data de Emissão" value={formatDate(infNfse.dataEmissao)} />
              <Field label="Código de Verificação" value={infNfse.codigoVerificacao} />
            </div>
          </div>
        </div>

        {/* ===== PRESTADOR ===== */}
        <div className="border-2 border-t-0 border-black dark:border-gray-400">
          <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] font-bold uppercase">
            Prestador de Serviços
          </div>
          <div className="grid grid-cols-[1fr_180px_160px]">
            <Field label="Razão Social" value={prestador.razaoSocial} />
            <Field label="CNPJ" value={formatCNPJorCPF(prestador.identificacaoPrestador.cnpj)} />
            <Field label="Inscrição Municipal" value={prestador.identificacaoPrestador.inscricaoMunicipal || ""} />
          </div>
          {prestador.nomeFantasia && (
            <Field label="Nome Fantasia" value={prestador.nomeFantasia} />
          )}
          <div className="grid grid-cols-[1fr_150px_80px_100px]">
            <Field
              label="Endereço"
              value={
                prestador.endereco.endereco
                  ? `${prestador.endereco.endereco}${prestador.endereco.numero ? `, ${prestador.endereco.numero}` : ""}`
                  : ""
              }
            />
            <Field label="Bairro" value={prestador.endereco.bairro || ""} />
            <Field label="UF" value={prestador.endereco.uf || ""} />
            <Field label="CEP" value={prestador.endereco.cep || ""} />
          </div>
          {prestador.contato && (
            <div className="grid grid-cols-2">
              <Field label="Telefone" value={prestador.contato.telefone || ""} />
              <Field label="E-mail" value={prestador.contato.email || ""} />
            </div>
          )}
        </div>

        {/* ===== TOMADOR ===== */}
        {tomador && (
          <div className="border-2 border-t-0 border-black dark:border-gray-400">
            <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] font-bold uppercase">
              Tomador de Serviços
            </div>
            <div className="grid grid-cols-[1fr_180px]">
              <Field label="Razão Social" value={tomador.razaoSocial} />
              <Field
                label="CNPJ / CPF"
                value={formatCNPJorCPF(
                  tomador.identificacaoTomador?.cnpj ||
                  tomador.identificacaoTomador?.cpf
                )}
              />
            </div>
            {tomador.endereco && (
              <div className="grid grid-cols-[1fr_150px_80px_100px]">
                <Field
                  label="Endereço"
                  value={
                    tomador.endereco.endereco
                      ? `${tomador.endereco.endereco}${tomador.endereco.numero ? `, ${tomador.endereco.numero}` : ""}`
                      : ""
                  }
                />
                <Field label="Bairro" value={tomador.endereco.bairro || ""} />
                <Field label="UF" value={tomador.endereco.uf || ""} />
                <Field label="CEP" value={tomador.endereco.cep || ""} />
              </div>
            )}
            {tomador.contato && (
              <div className="grid grid-cols-2">
                <Field label="Telefone" value={tomador.contato.telefone || ""} />
                <Field label="E-mail" value={tomador.contato.email || ""} />
              </div>
            )}
          </div>
        )}

        {/* ===== SERVIÇO ===== */}
        {servico && (
          <div className="border-2 border-t-0 border-black dark:border-gray-400">
            <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] font-bold uppercase">
              Discriminação do Serviço
            </div>
            <div className="grid grid-cols-3">
              <Field label="Item Lista Serviço" value={servico.itemListaServico} />
              <Field label="Código CNAE" value={servico.codigoCnae || ""} />
              <Field label="Código Tributação Municipal" value={servico.codigoTributacaoMunicipio || ""} />
            </div>
            <div className="border border-gray-300 dark:border-gray-600 p-2">
              <div className="text-[9px] text-gray-500 dark:text-gray-400 uppercase mb-1">Discriminação</div>
              <div className="text-xs whitespace-pre-wrap min-h-[60px]">
                {servico.discriminacao}
              </div>
            </div>
          </div>
        )}

        {/* ===== VALORES ===== */}
        {valores && (
          <div className="border-2 border-t-0 border-black dark:border-gray-400">
            <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] font-bold uppercase">
              Valores
            </div>
            <div className="grid grid-cols-4">
              <FieldRight label="Valor dos Serviços" value={formatCurrency(valores.valorServicos)} />
              <FieldRight label="Deduções" value={valores.valorDeducoes ? formatCurrency(valores.valorDeducoes) : "0,00"} />
              <FieldRight label="Base de Cálculo" value={valores.baseCalculo ? formatCurrency(valores.baseCalculo) : ""} />
              <FieldRight label="Alíquota" value={valores.aliquota ? `${valores.aliquota}%` : ""} />
            </div>
            <div className="grid grid-cols-4">
              <FieldRight label="Valor do ISS" value={valores.valorIss ? formatCurrency(valores.valorIss) : "0,00"} />
              <FieldRight label="ISS Retido" value={valores.valorIssRetido ? formatCurrency(valores.valorIssRetido) : "0,00"} />
              <FieldRight label="Outras Retenções" value={valores.outrasRetencoes ? formatCurrency(valores.outrasRetencoes) : "0,00"} />
              <FieldRight label="Valor Líquido" value={valores.valorLiquidoNfse ? formatCurrency(valores.valorLiquidoNfse) : ""} className="font-bold" />
            </div>
            <div className="grid grid-cols-4">
              <FieldRight label="PIS" value={valores.valorPis ? formatCurrency(valores.valorPis) : "0,00"} />
              <FieldRight label="COFINS" value={valores.valorCofins ? formatCurrency(valores.valorCofins) : "0,00"} />
              <FieldRight label="IR" value={valores.valorIr ? formatCurrency(valores.valorIr) : "0,00"} />
              <FieldRight label="CSLL" value={valores.valorCsll ? formatCurrency(valores.valorCsll) : "0,00"} />
            </div>
          </div>
        )}

        {/* ===== VALORES NFS-e ===== */}
        <div className="border-2 border-t-0 border-black dark:border-gray-400">
          <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] font-bold uppercase">
            Valores da NFS-e
          </div>
          <div className="grid grid-cols-4">
            <FieldRight label="Base de Cálculo" value={formatCurrency(infNfse.valoresNfse.baseCalculo)} />
            <FieldRight label="Alíquota" value={infNfse.valoresNfse.aliquota ? `${infNfse.valoresNfse.aliquota}%` : ""} />
            <FieldRight label="Valor do ISS" value={infNfse.valoresNfse.valorIss ? formatCurrency(infNfse.valoresNfse.valorIss) : "0,00"} />
            <FieldRight label="Valor Líquido" value={formatCurrency(infNfse.valoresNfse.valorLiquidoNfse)} className="font-bold" />
          </div>
        </div>

        {/* ===== OUTRAS INFORMAÇÕES ===== */}
        {infNfse.outrasInformacoes && (
          <div className="border-2 border-t-0 border-black dark:border-gray-400">
            <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] font-bold uppercase">
              Outras Informações
            </div>
            <div className="border border-gray-300 dark:border-gray-600 p-2">
              <div className="text-[9px] whitespace-pre-wrap">{infNfse.outrasInformacoes}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
