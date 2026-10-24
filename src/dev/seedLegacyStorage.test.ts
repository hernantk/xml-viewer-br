// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { seedLegacyStorage } from "./seedLegacyStorage";

const recent = () => JSON.parse(localStorage.getItem("xmlviewer-recent") ?? "[]");
const cache = () => JSON.parse(localStorage.getItem("xmlviewer-recent-cache") ?? "{}");

describe("seedLegacyStorage", () => {
  beforeEach(() => localStorage.clear());

  it("cria um XML de cada tipo no formato antigo", () => {
    expect(seedLegacyStorage()).toBe(5);

    const entries = recent();
    expect(entries.map((e: { documentType: string }) => e.documentType).sort()).toEqual(
      ["cte", "nfe", "nfse", "nfse-sped", "xml"],
    );
    for (const entry of entries) {
      expect(entry.source).toBe("memory");
      expect(entry.storedPath).toBeUndefined();
      expect(cache()[entry.id]).toContain("<?xml");
    }
  });

  it("não duplica ao rodar de novo e ignora o que já foi migrado", () => {
    seedLegacyStorage();
    const migrated = recent().map((e: { id: string }, i: number) =>
      i === 0 ? { ...e, storedPath: "C:/AppData/xmls/nfe/x.xml" } : e,
    );
    localStorage.setItem("xmlviewer-recent", JSON.stringify(migrated));
    const cacheWithoutFirst = { ...cache() };
    delete cacheWithoutFirst[migrated[0].id];
    localStorage.setItem("xmlviewer-recent-cache", JSON.stringify(cacheWithoutFirst));

    expect(seedLegacyStorage()).toBe(4);
    expect(recent()).toHaveLength(5);
    expect(cache()[migrated[0].id]).toBeUndefined();
  });
});
