import type { ParsedDocument } from "@/types/common";

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .trim() || "documento";
}

export function getPdfBaseName(document: ParsedDocument): string {
  if (document.documentType === "nfe" && document.nfe) {
    const { nNF, serie } = document.nfe.infNFe.ide;
    return sanitizeFileName(`DANFE_${nNF}_serie${serie}`);
  }

  if (document.documentType === "cte" && document.cte) {
    const { nCT } = document.cte.infCte.ide;
    return sanitizeFileName(`DACTe_${nCT}`);
  }

  if (document.documentType === "nfse" && document.nfse) {
    const { numero } = document.nfse.nfse.infNfse;
    return sanitizeFileName(`NFSe_${numero}`);
  }

  return "documento";
}

export function makeBatchZipDefaultName(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `xml-pdf-lote-${year}-${month}-${day}_${hours}-${minutes}.zip`;
}

export function ensureZipFileName(name: string): string {
  const sanitized = sanitizeFileName(name);
  return sanitized.toLowerCase().endsWith(".zip") ? sanitized : `${sanitized}.zip`;
}

export function resolveUniquePdfFileName(
  baseName: string,
  usedNames: Map<string, number>,
): string {
  const normalized = sanitizeFileName(baseName);
  const currentCount = usedNames.get(normalized) ?? 0;
  usedNames.set(normalized, currentCount + 1);

  if (currentCount === 0) {
    return `${normalized}.pdf`;
  }

  return `${normalized}_${currentCount + 1}.pdf`;
}
