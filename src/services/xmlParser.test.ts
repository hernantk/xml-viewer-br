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

  it("reporta XML inválido", () => {
    expect(() => parseXml("<root>")).toThrow("XML inválido:");
  });

  it("reporta elemento obrigatorio ausente com contexto", () => {
    const incompleteNfe = `<NFe><infNFe><emit /></infNFe></NFe>`;
    expect(() => parseXml(incompleteNfe)).toThrow("Elemento ide não encontrado em infNFe.");
  });

  it("lê múltiplos volumes do transporte", () => {
    const xml = `
    <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
      <NFe><infNFe Id="NFe1" versao="4.00">
        <ide><nNF>1</nNF><serie>1</serie></ide>
        <emit><CNPJ>12345678000190</CNPJ><xNome>E</xNome><enderEmit /></emit>
        <det nItem="1"><prod><cProd>1</cProd><xProd>P</xProd></prod><imposto /></det>
        <total><ICMSTot><vNF>10.00</vNF></ICMSTot></total>
        <transp><modFrete>1</modFrete>
          <vol><qVol>2</qVol><esp>CAIXA</esp><pesoB>10.00</pesoB><pesoL>9.00</pesoL></vol>
          <vol><qVol>3</qVol><esp>CAIXA</esp><pesoB>15.00</pesoB><pesoL>13.50</pesoL></vol>
        </transp>
      </infNFe></NFe>
    </nfeProc>`;
    const doc = parseXml(xml);
    expect(doc.documentType).toBe("nfe");
    const vol = doc.nfe?.infNFe.transp.vol;
    expect(vol).toHaveLength(2);
    expect(vol?.[0]?.qVol).toBe("2");
    expect(vol?.[1]?.qVol).toBe("3");
  });

  it("lê ICMS desonerado no item e no total", () => {
    const xml = `
    <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
      <NFe><infNFe Id="NFe1" versao="4.00">
        <ide><nNF>1</nNF><serie>1</serie></ide>
        <emit><CNPJ>12345678000190</CNPJ><xNome>E</xNome><enderEmit /></emit>
        <det nItem="1"><prod><cProd>1</cProd><cEAN>7891234567890</cEAN><xProd>P</xProd>
          <rastro><nLote>L1</nLote><qLote>2</qLote><dFab>2026-01-02</dFab><dVal>2028-03-04</dVal></rastro>
          <med><cProdANVISA>123456789</cProdANVISA><vPMC>41.28</vPMC></med></prod>
          <imposto><ICMS><ICMS20><orig>0</orig><CST>20</CST><vICMSDeson>5.00</vICMSDeson><motDesICMS>3</motDesICMS></ICMS20></ICMS></imposto>
          <infAdProd>Informação complementar do produto</infAdProd></det>
        <total><ICMSTot><vNF>10.00</vNF><vICMSDeson>5.00</vICMSDeson></ICMSTot></total>
        <transp><modFrete>9</modFrete></transp>
      </infNFe></NFe>
    </nfeProc>`;
    const doc = parseXml(xml);
    expect(doc.nfe?.infNFe.det[0]?.imposto.ICMS?.vICMSDeson).toBe("5.00");
    expect(doc.nfe?.infNFe.det[0]?.imposto.ICMS?.motDesICMS).toBe("3");
    expect(doc.nfe?.infNFe.det[0]?.prod.rastro?.[0]?.nLote).toBe("L1");
    expect(doc.nfe?.infNFe.det[0]?.prod.med?.cProdANVISA).toBe("123456789");
    expect(doc.nfe?.infNFe.det[0]?.infAdProd).toBe("Informação complementar do produto");
    expect(doc.nfe?.infNFe.total.ICMSTot.vICMSDeson).toBe("5.00");
  });

  it("lê IBS/CBS no item e nos totais", () => {
    const xml = `
    <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
      <NFe><infNFe Id="NFe1" versao="4.00">
        <ide><nNF>1</nNF><serie>1</serie></ide>
        <emit><CNPJ>12345678000190</CNPJ><xNome>E</xNome><enderEmit /></emit>
        <det nItem="1"><prod><cProd>1</cProd><xProd>P</xProd></prod>
          <imposto><IBSCBS><CST>000</CST><cClassTrib>000001</cClassTrib>
            <gIBSCBS><vBC>1000.00</vBC>
              <gIBSUF><pIBSUF>0.10</pIBSUF><vIBSUF>1.00</vIBSUF></gIBSUF>
              <gIBSMun><pIBSMun>0.00</pIBSMun><vIBSMun>0.00</vIBSMun></gIBSMun>
              <vIBS>1.00</vIBS>
              <gCBS><pCBS>0.90</pCBS><vCBS>9.00</vCBS></gCBS>
            </gIBSCBS></IBSCBS></imposto></det>
        <total><ICMSTot><vNF>1010.00</vNF></ICMSTot>
          <IBSCBSTot><vBCIBSCBS>1000.00</vBCIBSCBS>
            <gIBS><gIBSUF><vDif>0.00</vDif><vDevTrib>0.00</vDevTrib><vIBSUF>1.00</vIBSUF></gIBSUF>
              <gIBSMun><vDif>0.00</vDif><vDevTrib>0.00</vDevTrib><vIBSMun>0.00</vIBSMun></gIBSMun>
              <vIBS>1.00</vIBS></gIBS>
            <gCBS><vDif>0.00</vDif><vDevTrib>0.00</vDevTrib><vCBS>9.00</vCBS></gCBS>
          </IBSCBSTot></total>
        <transp><modFrete>9</modFrete></transp>
      </infNFe></NFe>
    </nfeProc>`;
    const doc = parseXml(xml);
    const ibs = doc.nfe?.infNFe.det[0]?.imposto.IBSCBS;
    expect(ibs?.CST).toBe("000");
    expect(ibs?.cClassTrib).toBe("000001");
    expect(ibs?.vBC).toBe("1000.00");
    expect(ibs?.vIBSUF).toBe("1.00");
    expect(ibs?.vCBS).toBe("9.00");
    expect(doc.nfe?.infNFe.total.IBSCBSTot?.vBCIBSCBS).toBe("1000.00");
    expect(doc.nfe?.infNFe.total.IBSCBSTot?.gIBS?.gIBSUF?.vIBSUF).toBe("1.00");
    expect(doc.nfe?.infNFe.total.IBSCBSTot?.gCBS?.vCBS).toBe("9.00");
  });
});
