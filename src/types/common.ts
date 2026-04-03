export type DocumentType = "nfe" | "cte" | "nfse";

export interface RecentFileEntry {
  id: string;
  label: string;
  source: "filesystem" | "memory";
  lastOpenedAt: number;
  documentType?: DocumentType;
  // Metadados para busca
  chave?: string;
  numero?: string;
  cnpjEmitente?: string;
  nomeEmitente?: string;
  cnpjDestinatario?: string;
  nomeDestinatario?: string;
}

export interface Endereco {
  xLgr: string;
  nro: string;
  xCpl?: string;
  xBairro: string;
  cMun: string;
  xMun: string;
  UF: string;
  CEP: string;
  cPais?: string;
  xPais?: string;
  fone?: string;
}

export interface Empresa {
  CNPJ?: string;
  CPF?: string;
  xNome: string;
  xFant?: string;
  IE?: string;
  IM?: string;
  endereco: Endereco;
  fone?: string;
  email?: string;
}

export interface ValidationResult {
  schemaValid: boolean;
  signatureValid: boolean;
  schemaErrors: string[];
  signatureErrors: string[];
  certificateSubject?: string;
  certificateExpiry?: string;
}

export interface ParsedDocument {
  documentType: DocumentType;
  nfe?: import("./nfe").Nfe;
  cte?: import("./cte").Cte;
  nfse?: import("./nfse").CompNfse;
}

export interface BatchProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
}

export interface BatchSummary {
  sourceDir: string;
  outputPath: string | null;
  totalFound: number;
  generated: number;
  skipped: number;
}

export interface BatchErrorItem {
  fileName: string;
  reason: string;
}
