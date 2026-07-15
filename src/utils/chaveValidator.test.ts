import { describe, expect, it } from "vitest";
import { validateChave } from "./chaveValidator";

const VALID_NFCE_KEY = "35240112345678000195650010000001231123456784";

describe("validateChave", () => {
  it("identifica corretamente a NFC-e modelo 65", () => {
    const result = validateChave(VALID_NFCE_KEY);

    expect(result.valid).toBe(true);
    expect(result.modelo).toEqual({ codigo: "65", descricao: "NFC-e" });
  });

  it("aceita uma chave formatada e valida somente o DV", () => {
    const formatted = VALID_NFCE_KEY.replace(/(\d{4})(?=\d)/g, "$1 ");

    const result = validateChave(formatted);

    expect(result.valid).toBe(true);
    expect(result.chaveLimpa).toBe(VALID_NFCE_KEY);
  });

  it("informa divergência no dígito verificador", () => {
    const invalidKey = `${VALID_NFCE_KEY.slice(0, -1)}0`;

    const result = validateChave(invalidKey);

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Dígito verificador inválido");
  });

  it("rejeita entradas que não tenham 44 dígitos", () => {
    expect(validateChave("123")).toMatchObject({
      valid: false,
      error: "A chave deve conter 44 dígitos (informado: 3).",
    });
  });
});
