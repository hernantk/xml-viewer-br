import { describe, expect, it } from "vitest";
import {
  formatPartialDoc,
  getEmitenteGroupKey,
  getEmitenteTooltip,
  groupByEmitente,
} from "./emitenteGrouping";
import type { RecentFileEntry } from "@/types/common";

function entry(overrides: Partial<RecentFileEntry> & { id: string }): RecentFileEntry {
  return {
    label: overrides.id,
    source: "memory",
    lastOpenedAt: 0,
    ...overrides,
  };
}

describe("emitenteGrouping", () => {
  it("agrupa pelo CNPJ normalizado (ignora máscara)", () => {
    const files = [
      entry({ id: "a", cnpjEmitente: "12.345.678/0001-95", nomeEmitente: "Empresa A", lastOpenedAt: 10 }),
      entry({ id: "b", cnpjEmitente: "12345678000195", nomeEmitente: "Empresa A Filial", lastOpenedAt: 20 }),
      entry({ id: "c", cnpjEmitente: "98.765.432/0001-10", nomeEmitente: "Empresa B", lastOpenedAt: 30 }),
    ];
    const groups = groupByEmitente(files);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.files.map((f) => f.id)).toEqual(["c"]);
    expect(groups[1]?.files.map((f) => f.id)).toEqual(["b", "a"]);
  });

  it("usa o nome quando não há CNPJ e isola sem emitente", () => {
    expect(getEmitenteGroupKey(entry({ id: "x", nomeEmitente: "  Acme LTDA " }))).toBe("nome:acme ltda");
    expect(getEmitenteGroupKey(entry({ id: "y" }))).toBe("sem-emitente");
  });

  it("ordena grupos pela última atividade e fixados primeiro dentro do grupo", () => {
    const files = [
      entry({ id: "old", cnpjEmitente: "11", nomeEmitente: "Antiga", lastOpenedAt: 5 }),
      entry({ id: "new-1", cnpjEmitente: "22", nomeEmitente: "Nova", lastOpenedAt: 100 }),
      entry({ id: "new-2", cnpjEmitente: "22", nomeEmitente: "Nova", lastOpenedAt: 10, pinned: true }),
    ];
    const groups = groupByEmitente(files);
    expect(groups[0]?.nomeEmitente).toBe("Nova");
    expect(groups[0]?.lastActivity).toBe(100);
    expect(groups[0]?.files.map((f) => f.id)).toEqual(["new-2", "new-1"]);
  });

  it("mostra só parte do CNPJ e tooltip com nome completo", () => {
    expect(formatPartialDoc("12.345.678/0001-95")).toBe("12.345.678/0001-**");
    expect(formatPartialDoc("123.456.789-09")).toBe("123.456.***-**");
    expect(
      getEmitenteTooltip({ nomeEmitente: "Acme LTDA", cnpjEmitente: "12345678000195" }),
    ).toBe("Acme LTDA • 12.345.678/0001-95");
  });
});
