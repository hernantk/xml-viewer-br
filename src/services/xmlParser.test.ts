// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { detectDocumentType, parseXml } from "./xmlParser";

const nfeXml = `
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe123" versao="4.00">
      <ide><nNF>10</nNF><serie>1</serie></ide>
      <emit><CNPJ>12345678000190</CNPJ><xNome>Emitente</xNome><enderEmit /></emit>
      <dest><CPF>12345678909</CPF><xNome>Destinatario</xNome></dest>
      <det nItem="1"><prod><cProd>1</cProd><xProd>Produto</xProd></prod><imposto /></det>
      <total><ICMSTot><vNF>100.00</vNF></ICMSTot></total>
      <transp><modFrete>9</modFrete></transp>
    </infNFe>
  </NFe>
</nfeProc>`;

const cteXml = `
<cteProc xmlns="http://www.portalfiscal.inf.br/cte">
  <CTe>
    <infCte Id="CTe123" versao="4.00">
      <ide><nCT>20</nCT></ide>
      <emit><CNPJ>12345678000190</CNPJ><xNome>Transportadora</xNome><enderEmit /></emit>
      <dest><CNPJ>00987654000199</CNPJ><xNome>Destino</xNome></dest>
      <vPrest><vTPrest>50.00</vTPrest><vRec>50.00</vRec></vPrest>
      <imp><ICMS /></imp>
    </infCte>
  </CTe>
</cteProc>`;

const nfseXml = `
<CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Nfse>
    <InfNfse>
      <Numero>30</Numero>
      <CodigoVerificacao>ABC123</CodigoVerificacao>
      <ValoresNfse><BaseCalculo>200.00</BaseCalculo><ValorLiquidoNfse>200.00</ValorLiquidoNfse></ValoresNfse>
      <PrestadorServico>
        <IdentificacaoPrestador><Cnpj>12345678000190</Cnpj></IdentificacaoPrestador>
        <RazaoSocial>Prestador</RazaoSocial>
      </PrestadorServico>
    </InfNfse>
  </Nfse>
</CompNfse>`;

const spedNfseXml = `
<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infNFSe Id="NFS123">
    <nNFSe>40</nNFSe>
    <emit><CNPJ>12345678000190</CNPJ><xNome>Prestador SPED</xNome><enderNac /></emit>
    <valores><vLiq>300.00</vLiq></valores>
  </infNFSe>
</NFSe>`;

describe("detectDocumentType", () => {
  it.each([
    [nfeXml, "nfe"],
    [cteXml, "cte"],
    [nfseXml, "nfse"],
    [spedNfseXml, "nfse-sped"],
    ["<root><value>1</value></root>", "xml"],
  ] as const)("detecta %s como %s", (xml, expected) => {
    expect(detectDocumentType(xml)).toBe(expected);
  });

  it("rejeita XML vazio com mensagem clara", () => {
    expect(() => detectDocumentType("   ")).toThrow("Arquivo XML vazio.");
  });
});

describe("parseXml", () => {
  it("parseia documentos fiscais suportados", () => {
    expect(parseXml(nfeXml).documentType).toBe("nfe");
    expect(parseXml(cteXml).documentType).toBe("cte");
    expect(parseXml(nfseXml).documentType).toBe("nfse");
    expect(parseXml(spedNfseXml).documentType).toBe("nfse-sped");
  });

  it("mantem XML generico como visualizacao generica", () => {
    expect(parseXml("<root><value>1</value></root>")).toEqual({ documentType: "xml" });
  });

  it("reporta XML invalido", () => {
    expect(() => parseXml("<root>")).toThrow("XML inválido:");
  });

  it("reporta elemento obrigatorio ausente com contexto", () => {
    const incompleteNfe = `<NFe><infNFe><emit /></infNFe></NFe>`;
    expect(() => parseXml(incompleteNfe)).toThrow("Elemento ide não encontrado em infNFe.");
  });
});
