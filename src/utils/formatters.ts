export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

export function formatCNPJorCPF(doc?: string): string {
  if (!doc) return "";
  const digits = doc.replace(/\D/g, "");
  if (digits.length === 14) return formatCNPJ(digits);
  if (digits.length === 11) return formatCPF(digits);
  return doc;
}

export function formatCEP(cep: string): string {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return cep;
  return digits.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

export function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0,00";
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatQuantity(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

export function formatDate(isoDate: string): string {
  if (!isoDate) return "";
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString("pt-BR");
  } catch {
    return isoDate;
  }
}

export function formatDateTime(isoDate: string): string {
  if (!isoDate) return "";
  try {
    const date = new Date(isoDate);
    return date.toLocaleString("pt-BR");
  } catch {
    return isoDate;
  }
}

export function formatPhone(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }
  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  return phone;
}

export function formatAccessKey(key: string): string {
  return key.replace(/(\d{4})/g, "$1 ").trim();
}

export function formatTime(isoDate: string): string {
  if (!isoDate) return "";
  try {
    const date = new Date(isoDate);
    return date.toLocaleTimeString("pt-BR");
  } catch {
    return isoDate;
  }
}

export function formatNFNumber(num: string): string {
  const digits = num.replace(/\D/g, "");
  return digits.replace(/(\d)(?=(\d{3})+$)/g, "$1.");
}

export const MODAL_FRETE: Record<string, string> = {
  "0": "0 - Contratação do Frete por conta do Remetente (CIF)",
  "1": "1 - Contratação do Frete por conta do Destinatário (FOB)",
  "2": "2 - Contratação do Frete por conta de Terceiros",
  "3": "3 - Transporte Próprio por conta do Remetente",
  "4": "4 - Transporte Próprio por conta do Destinatário",
  "9": "9 - Sem Ocorrência de Transporte",
};

export const MODAL_TRANSPORTE: Record<string, string> = {
  "01": "Rodoviário",
  "02": "Aéreo",
  "03": "Aquaviário",
  "04": "Ferroviário",
  "05": "Dutoviário",
  "06": "Multimodal",
};
