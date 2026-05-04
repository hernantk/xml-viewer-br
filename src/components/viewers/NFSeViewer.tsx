import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { CompNfse } from "@/types/nfse";
import { formatCNPJorCPF, formatCurrency, formatDate } from "@/utils/formatters";
import {
  measureA4HeightPx,
  PAGE_PADDING_PX,
  PAGE_SAFETY_PX,
  chunkBlockKeys,
  arePageChunksEqual,
} from "@/utils/paginationUtils";
import { usePaginationResize } from "@/hooks/usePaginationResize";

interface Props {
  nfse: CompNfse;
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

export function NFSeViewer({ nfse }: Props) {
  const { infNfse } = nfse.nfse;
  const prestador = infNfse.prestadorServico;
  const tomador = infNfse.tomadorServico;
  const dps = infNfse.declaracaoPrestacaoServico;
  const servico = dps?.infDeclaracaoPrestacaoServico.servico;
  const valores = servico?.valores;

  const measureRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const headerBlock = (
    <div>
      <div className="rounded border border-black p-[3pt] text-center" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        <div className="text-[14pt] font-bold tracking-wider">
          NOTA FISCAL DE SERVIÇO ELETRÔNICA - NFS-e
        </div>
      </div>
      <div className="grid grid-cols-3">
        <Field label="Número da NFS-e" value={infNfse.numero} />
        <Field label="Data de Emissão" value={formatDate(infNfse.dataEmissao)} />
        <Field label="Código de Verificação" value={infNfse.codigoVerificacao} />
      </div>
    </div>
  );

  const providerBlock = (
    <div>
      <SectionTitle>Prestador de Serviços</SectionTitle>
      <div className="grid grid-cols-[1fr_170px_150px]">
        <Field label="Razão Social" value={prestador.razaoSocial} />
        <Field
          label="CNPJ"
          value={formatCNPJorCPF(prestador.identificacaoPrestador.cnpj)}
        />
        <Field
          label="Inscrição Municipal"
          value={prestador.identificacaoPrestador.inscricaoMunicipal || ""}
        />
      </div>
      {prestador.nomeFantasia && (
        <Field label="Nome Fantasia" value={prestador.nomeFantasia} />
      )}
      <div className="grid grid-cols-[1fr_150px_60px_100px]">
        <Field
          label="Endereço"
          value={
            prestador.endereco.endereco
              ? `${prestador.endereco.endereco}${
                  prestador.endereco.numero ? `, ${prestador.endereco.numero}` : ""
                }`
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
  );

  const customerBlock =
    tomador && (
      <div>
        <SectionTitle>Tomador de Serviços</SectionTitle>
        <div className="grid grid-cols-[1fr_170px]">
          <Field label="Razão Social" value={tomador.razaoSocial} />
          <Field
            label="CNPJ / CPF"
            value={formatCNPJorCPF(
              tomador.identificacaoTomador?.cnpj || tomador.identificacaoTomador?.cpf,
            )}
          />
        </div>
        {tomador.endereco && (
          <div className="grid grid-cols-[1fr_150px_60px_100px]">
            <Field
              label="Endereço"
              value={
                tomador.endereco.endereco
                  ? `${tomador.endereco.endereco}${
                      tomador.endereco.numero ? `, ${tomador.endereco.numero}` : ""
                    }`
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
    );

  const serviceBlock =
    servico && (
      <div>
        <SectionTitle>Discriminação do Serviço</SectionTitle>
        <div className="grid grid-cols-3">
          <Field label="Item Lista Serviço" value={servico.itemListaServico} />
          <Field label="Código CNAE" value={servico.codigoCnae || ""} />
          <Field
            label="Código Tributação Municipal"
            value={servico.codigoTributacaoMunicipio || ""}
          />
        </div>
        <div className="rounded border border-black px-[2pt] py-[1pt]">
          <div className="text-[6pt] leading-[1.1] uppercase">
            Discriminação
          </div>
          <div className="text-[6pt] mt-[1pt] whitespace-pre-wrap min-h-[50px] leading-[1.1]">
            {servico.discriminacao}
          </div>
        </div>
      </div>
    );

  const valuesBlock =
    valores && (
      <div>
        <SectionTitle>Valores</SectionTitle>
        <div className="grid grid-cols-4">
          <FieldRight
            label="Valor dos Serviços"
            value={formatCurrency(valores.valorServicos)}
          />
          <FieldRight
            label="Deduções"
            value={valores.valorDeducoes ? formatCurrency(valores.valorDeducoes) : "0,00"}
          />
          <FieldRight
            label="Base de Cálculo"
            value={valores.baseCalculo ? formatCurrency(valores.baseCalculo) : ""}
          />
          <FieldRight
            label="Alíquota"
            value={valores.aliquota ? `${valores.aliquota}%` : ""}
          />
        </div>
        <div className="grid grid-cols-4">
          <FieldRight
            label="Valor do ISS"
            value={valores.valorIss ? formatCurrency(valores.valorIss) : "0,00"}
          />
          <FieldRight
            label="ISS Retido"
            value={
              valores.valorIssRetido ? formatCurrency(valores.valorIssRetido) : "0,00"
            }
          />
          <FieldRight
            label="Outras Retenções"
            value={
              valores.outrasRetencoes ? formatCurrency(valores.outrasRetencoes) : "0,00"
            }
          />
          <FieldRight
            label="Valor Líquido"
            value={
              valores.valorLiquidoNfse ? formatCurrency(valores.valorLiquidoNfse) : ""
            }
            className="font-bold"
          />
        </div>
        <div className="grid grid-cols-4">
          <FieldRight
            label="PIS"
            value={valores.valorPis ? formatCurrency(valores.valorPis) : "0,00"}
          />
          <FieldRight
            label="COFINS"
            value={valores.valorCofins ? formatCurrency(valores.valorCofins) : "0,00"}
          />
          <FieldRight
            label="IR"
            value={valores.valorIr ? formatCurrency(valores.valorIr) : "0,00"}
          />
          <FieldRight
            label="CSLL"
            value={valores.valorCsll ? formatCurrency(valores.valorCsll) : "0,00"}
          />
        </div>
      </div>
    );

  const nfseValuesBlock = (
    <div>
      <SectionTitle>Valores da NFS-e</SectionTitle>
      <div className="grid grid-cols-4">
        <FieldRight
          label="Base de Cálculo"
          value={formatCurrency(infNfse.valoresNfse.baseCalculo)}
        />
        <FieldRight
          label="Alíquota"
          value={
            infNfse.valoresNfse.aliquota ? `${infNfse.valoresNfse.aliquota}%` : ""
          }
        />
        <FieldRight
          label="Valor do ISS"
          value={
            infNfse.valoresNfse.valorIss
              ? formatCurrency(infNfse.valoresNfse.valorIss)
              : "0,00"
          }
        />
        <FieldRight
          label="Valor Líquido"
          value={formatCurrency(infNfse.valoresNfse.valorLiquidoNfse)}
          className="font-bold"
        />
      </div>
    </div>
  );

  const othersBlock =
    infNfse.outrasInformacoes && (
      <div>
        <SectionTitle>Outras Informações</SectionTitle>
        <div className="rounded border border-black px-[2pt] py-[1pt]">
          <div className="text-[6pt] leading-[1.1] whitespace-pre-wrap">{infNfse.outrasInformacoes}</div>
        </div>
      </div>
    );

  const contentBlocks: ContentBlock[] = [
    { key: "header", node: headerBlock },
    { key: "provider", node: providerBlock },
    ...(customerBlock ? [{ key: "customer", node: customerBlock }] : []),
    ...(serviceBlock ? [{ key: "service", node: serviceBlock }] : []),
    ...(valuesBlock ? [{ key: "values", node: valuesBlock }] : []),
    { key: "nfse-values", node: nfseValuesBlock },
    ...(othersBlock ? [{ key: "others", node: othersBlock }] : []),
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
