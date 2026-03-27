import type { CompNfse } from "@/types/nfse";
import { formatCNPJorCPF, formatCurrency, formatDate } from "@/utils/formatters";

interface Props {
  nfse: CompNfse;
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide border-b border-gray-300 dark:border-gray-600">
      {children}
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
      <div className="p-4 text-black dark:text-gray-100">

        {/* ===== HEADER ===== */}
        <div className="border border-black dark:border-gray-400">
          <div className="p-3 text-center">
            <div className="text-lg font-bold tracking-wider">NOTA FISCAL DE SERVIÇO ELETRÔNICA - NFS-e</div>
          </div>
          <div className="grid grid-cols-3 border-t border-black dark:border-gray-400">
            <Field label="Número da NFS-e" value={infNfse.numero} />
            <Field label="Data de Emissão" value={formatDate(infNfse.dataEmissao)} />
            <Field label="Código de Verificação" value={infNfse.codigoVerificacao} />
          </div>
        </div>

        {/* ===== PRESTADOR ===== */}
        <div className="border border-t-0 border-black dark:border-gray-400">
          <SectionTitle>Prestador de Serviços</SectionTitle>
          <div className="grid grid-cols-[1fr_170px_150px]">
            <Field label="Razão Social" value={prestador.razaoSocial} />
            <Field label="CNPJ" value={formatCNPJorCPF(prestador.identificacaoPrestador.cnpj)} />
            <Field label="Inscrição Municipal" value={prestador.identificacaoPrestador.inscricaoMunicipal || ""} />
          </div>
          {prestador.nomeFantasia && (
            <Field label="Nome Fantasia" value={prestador.nomeFantasia} />
          )}
          <div className="grid grid-cols-[1fr_150px_60px_100px]">
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
          <div className="border border-t-0 border-black dark:border-gray-400">
            <SectionTitle>Tomador de Serviços</SectionTitle>
            <div className="grid grid-cols-[1fr_170px]">
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
              <div className="grid grid-cols-[1fr_150px_60px_100px]">
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
          <div className="border border-t-0 border-black dark:border-gray-400">
            <SectionTitle>Discriminação do Serviço</SectionTitle>
            <div className="grid grid-cols-3">
              <Field label="Item Lista Serviço" value={servico.itemListaServico} />
              <Field label="Código CNAE" value={servico.codigoCnae || ""} />
              <Field label="Código Tributação Municipal" value={servico.codigoTributacaoMunicipio || ""} />
            </div>
            <div className="border border-gray-300 dark:border-gray-600 px-1.5 py-1">
              <div className="text-[7px] text-gray-500 dark:text-gray-400 uppercase mb-0.5">Discriminação</div>
              <div className="text-[10px] whitespace-pre-wrap min-h-[60px]">
                {servico.discriminacao}
              </div>
            </div>
          </div>
        )}

        {/* ===== VALORES ===== */}
        {valores && (
          <div className="border border-t-0 border-black dark:border-gray-400">
            <SectionTitle>Valores</SectionTitle>
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
        <div className="border border-t-0 border-black dark:border-gray-400">
          <SectionTitle>Valores da NFS-e</SectionTitle>
          <div className="grid grid-cols-4">
            <FieldRight label="Base de Cálculo" value={formatCurrency(infNfse.valoresNfse.baseCalculo)} />
            <FieldRight label="Alíquota" value={infNfse.valoresNfse.aliquota ? `${infNfse.valoresNfse.aliquota}%` : ""} />
            <FieldRight label="Valor do ISS" value={infNfse.valoresNfse.valorIss ? formatCurrency(infNfse.valoresNfse.valorIss) : "0,00"} />
            <FieldRight label="Valor Líquido" value={formatCurrency(infNfse.valoresNfse.valorLiquidoNfse)} className="font-bold" />
          </div>
        </div>

        {/* ===== OUTRAS INFORMAÇÕES ===== */}
        {infNfse.outrasInformacoes && (
          <div className="border border-t-0 border-black dark:border-gray-400">
            <SectionTitle>Outras Informações</SectionTitle>
            <div className="border border-gray-300 dark:border-gray-600 px-1.5 py-1">
              <div className="text-[8px] whitespace-pre-wrap">{infNfse.outrasInformacoes}</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
