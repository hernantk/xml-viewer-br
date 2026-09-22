// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ICMSTot } from "@/types/nfe";
import { chunkProducts, IcmsTaxCalculation, ProductDescription, TransportVolumesRow } from "./DANFEViewer";

const totalFromNf37900: ICMSTot = {
  vBC: "32004.75",
  vICMS: "1280.16",
  vICMSDeson: "0",
  vFCP: "0",
  vBCST: "0",
  vST: "0",
  vFCPST: "0",
  vFCPSTRet: "0",
  vProd: "31733.85",
  vFrete: "270.90",
  vSeg: "0",
  vDesc: "0",
  vII: "0",
  vIPI: "0",
  vIPIDevol: "0",
  vPIS: "523.58",
  vCOFINS: "2411.74",
  vOutro: "0",
  vNF: "32004.75",
};

describe("IcmsTaxCalculation", () => {
  it("exibe o ICMS desonerado junto ao valor do ICMS, inclusive quando é zero", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(<IcmsTaxCalculation total={totalFromNf37900} />);

    const firstRow = container.querySelector(".grid-cols-5");
    const fields = Array.from(firstRow?.children ?? []).map((field) => field.textContent);

    expect(fields).toEqual([
      "Base de Cálc. do ICMS32.004,75",
      "Valor do ICMS1.280,16",
      "V. ICMS Desonerado0,00",
      "Base de Cálc. ICMS S.T.0,00",
      "Valor do ICMS Subst.0,00",
    ]);
  });
});

describe("TransportVolumesRow", () => {
  it("organiza quantidade, espécie, marca, numeração e pesos em uma única linha", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(
      <TransportVolumesRow
        volumes={[
          { qVol: "100", esp: "VOLUME", marca: "A", nVol: "1-100", pesoB: "200.500", pesoL: "190.250" },
          { qVol: "37", esp: "VOLUME", marca: "A", nVol: "101-137", pesoB: "98.562", pesoL: "35.707" },
        ]}
      />,
    );

    const fields = Array.from(container.firstElementChild?.children ?? []).map((field) => field.textContent);

    expect(fields).toEqual([
      "Quantidade137",
      "EspécieVOLUME",
      "MarcaA",
      "Numeração1-100, 101-137",
      "Peso Bruto299,062",
      "Peso Líquido225,957",
    ]);
  });
});

describe("ProductDescription", () => {
  it("exibe cada registro de rastreabilidade junto da descrição do produto", () => {
    const product = {
      cProd: "005964",
      cEAN: "7898731960860",
      xProd: "MICROCANULAS UNIQMED",
      NCM: "90183929",
      CFOP: "6102",
      uCom: "CX",
      qCom: "3",
      vUnCom: "200.55",
      vProd: "601.65",
      cEANTrib: "",
      uTrib: "CX",
      qTrib: "3",
      vUnTrib: "200.55",
      indTot: "1",
      rastro: [
        { nLote: "B7435B", qLote: "2.000", dFab: "2023-08-21", dVal: "2028-05-24" },
        { nLote: "B7436C", qLote: "1.000", dFab: "2023-09-01", dVal: "2028-06-30", cAgreg: "CX01" },
      ],
      med: { cProdANVISA: "1542302350147", vPMC: "41.28" },
    };
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(
      <ProductDescription product={product} additionalInfo="DICLORIDRATO DE BISTATINA TIP. TRIBUT" />,
    );

    expect(Array.from(container.children).map((line) => line.textContent)).toEqual([
      "MICROCANULAS UNIQMED",
      "Lote-B7435B Fab-21/08/2023 Val-24/05/2028 Qtd-2",
      "Lote-B7436C Fab-01/09/2023 Val-30/06/2028 Qtd-1 Agreg-CX01",
      "R. ANVISA-1542302350147",
      "PMC-41,28",
      "DICLORIDRATO DE BISTATINA TIP. TRIBUT",
      "Cód. Barras: 7898731960860",
    ]);
  });

  it("não repete lote e vencimento presentes em infAdProd", () => {
    const product = {
      cProd: "005964",
      cEAN: "SEM GTIN",
      xProd: "MICROCANULAS UNIQMED",
      NCM: "90183929",
      CFOP: "6102",
      uCom: "CX",
      qCom: "2",
      vUnCom: "200.55",
      vProd: "401.10",
      cEANTrib: "SEM GTIN",
      uTrib: "CX",
      qTrib: "2",
      vUnTrib: "200.55",
      indTot: "1",
      rastro: [{ nLote: "B7435B", qLote: "2.000", dFab: "2023-08-21", dVal: "2028-05-24" }],
    };
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(
      <ProductDescription
        product={product}
        additionalInfo="Part Number: FTMN27-40-26. Lote: B7435B - Dt. Valid.: 24/05/2028"
      />,
    );

    expect(Array.from(container.children).map((line) => line.textContent)).toEqual([
      "MICROCANULAS UNIQMED",
      "Lote-B7435B Fab-21/08/2023 Val-24/05/2028 Qtd-2",
    ]);
  });
});

describe("chunkProducts", () => {
  it("reserva o rodapé para a última página sem reduzir prematuramente a primeira", () => {
    expect(chunkProducts([100, 100, 100, 100, 100, 100], 450, 700, 200)).toEqual([
      [0, 1, 2, 3],
      [4, 5],
    ]);
  });
});
