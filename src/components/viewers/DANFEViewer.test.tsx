// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ICMSTot } from "@/types/nfe";
import { IcmsTaxCalculation, TransportVolumesRow } from "./DANFEViewer";

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
