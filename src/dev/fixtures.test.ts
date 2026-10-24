// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { parseXml } from "@/services/xmlParser";
import nfeXml from "./fixtures/nfe.xml?raw";
import cteXml from "./fixtures/cte.xml?raw";
import nfseXml from "./fixtures/nfse.xml?raw";
import nfseNacionalXml from "./fixtures/nfse-nacional.xml?raw";
import genericoXml from "./fixtures/generico.xml?raw";

describe("fixtures de desenvolvimento", () => {
  it.each([
    ["nfe", nfeXml, "nfe"],
    ["cte", cteXml, "cte"],
    ["nfse", nfseXml, "nfse"],
    ["nfse-nacional", nfseNacionalXml, "nfse-sped"],
    ["generico", genericoXml, "xml"],
  ] as const)("%s é reconhecido pelo parser", (_name, xml, type) => {
    expect(parseXml(xml).documentType).toBe(type);
  });
});
