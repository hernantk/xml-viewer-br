import { describe, expect, it } from "vitest";
import { formatDate } from "./formatters";

describe("formatDate", () => {
  it("preserva o dia de datas de vencimento sem horário", () => {
    expect(formatDate("2026-09-25")).toBe("25/09/2026");
  });

  it("mantém valores inválidos sem exibir Invalid Date", () => {
    expect(formatDate("data desconhecida")).toBe("data desconhecida");
  });
});
