export interface ChaveValidationResult {
  valid: boolean;
  error?: string;
  chaveLimpa?: string;
  uf?: { codigo: string; nome: string };
  anoMes?: string;
  cnpj?: string;
  modelo?: { codigo: string; descricao: string };
  serie?: string;
  numero?: string;
  tpEmis?: string;
  cNF?: string;
  dv?: string;
  dvCalculado?: string;
}

const UF_MAP: Record<string, string> = {
  "11": "Rondônia",
  "12": "Acre",
  "13": "Amazonas",
  "14": "Roraima",
  "15": "Pará",
  "16": "Amapá",
  "17": "Tocantins",
  "21": "Maranhão",
  "22": "Piauí",
  "23": "Ceará",
  "24": "Rio Grande do Norte",
  "25": "Paraíba",
  "26": "Pernambuco",
  "27": "Alagoas",
  "28": "Sergipe",
  "29": "Bahia",
  "31": "Minas Gerais",
  "32": "Espírito Santo",
  "33": "Rio de Janeiro",
  "35": "São Paulo",
  "41": "Paraná",
  "42": "Santa Catarina",
  "43": "Rio Grande do Sul",
  "50": "Mato Grosso do Sul",
  "51": "Mato Grosso",
  "52": "Goiás",
  "53": "Distrito Federal",
};

const MODELO_MAP: Record<string, string> = {
  "55": "NF-e",
  "57": "CT-e",
  "65": "NFS-e",
};

export function validateChave(chave: string): ChaveValidationResult {
  const chaveLimpa = chave.replace(/\D/g, "");

  if (chaveLimpa.length === 0) {
    return { valid: false, error: "Informe uma chave de acesso." };
  }

  if (chaveLimpa.length !== 44) {
    return {
      valid: false,
      error: `A chave deve conter 44 dígitos (informado: ${chaveLimpa.length}).`,
    };
  }

  const dvEsperado = calcularDV(chaveLimpa);
  const dvInformado = chaveLimpa[43];
  const dvValido = dvEsperado === dvInformado;

  if (!dvValido) {
    return {
      valid: false,
      error: `Dígito verificador inválido. Esperado: ${dvEsperado}, informado: ${dvInformado}.`,
      chaveLimpa,
      dv: dvInformado,
      dvCalculado: dvEsperado,
    };
  }

  const codigoUF = chaveLimpa.substring(0, 2);
  const anoMes = chaveLimpa.substring(2, 6);
  const cnpj = chaveLimpa.substring(6, 20);
  const codigoModelo = chaveLimpa.substring(20, 22);
  const serie = chaveLimpa.substring(22, 25);
  const numero = chaveLimpa.substring(25, 34);
  const tpEmis = chaveLimpa.substring(34, 35);
  const cNF = chaveLimpa.substring(35, 43);

  return {
    valid: true,
    chaveLimpa,
    uf: { codigo: codigoUF, nome: UF_MAP[codigoUF] || "Desconhecido" },
    anoMes,
    cnpj,
    modelo: {
      codigo: codigoModelo,
      descricao: MODELO_MAP[codigoModelo] || "Desconhecido",
    },
    serie,
    numero,
    tpEmis,
    cNF,
    dv: dvInformado,
    dvCalculado: dvEsperado,
  };
}

function calcularDV(chave: string): string {
  let soma = 0;
  let peso = 2;
  for (let i = 42; i >= 0; i--) {
    soma += parseInt(chave[i], 10) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = resto < 2 ? 0 : 11 - resto;
  return String(dv);
}

export function formatChaveGrupos(chave: string): string {
  return chave.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}
