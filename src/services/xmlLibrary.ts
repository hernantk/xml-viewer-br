/**
 * Biblioteca local de XMLs: cada arquivo importado é copiado para
 * `$APPDATA/xmls/<categoria>/` e apagado de lá quando sai do histórico.
 */

import type { DocumentType } from "@/types/common";
import { isTauriRuntime } from "@/utils/runtime";

export type LibraryCategory = "nfe" | "cte" | "nfse" | "nfse-nacional" | "outros";

export function libraryCategory(documentType?: DocumentType): LibraryCategory {
  switch (documentType) {
    case "nfe":
      return "nfe";
    case "cte":
      return "cte";
    case "nfse":
      return "nfse";
    case "nfse-sped":
      return "nfse-nacional";
    default:
      return "outros";
  }
}

/** Prefers the access key digits; falls back to the original file name. */
export function libraryFileName(label: string, chave?: string): string {
  const digits = chave?.replace(/\D/g, "") ?? "";
  if (digits.length >= 44) return `${digits}.xml`;
  return label;
}

interface StoreXmlInput {
  content: string;
  documentType?: DocumentType;
  label: string;
  chave?: string;
  existingPath?: string;
}

/** Returns the stored path, or null outside the desktop app. */
export async function storeXmlInLibrary({
  content,
  documentType,
  label,
  chave,
  existingPath,
}: StoreXmlInput): Promise<string | null> {
  if (!isTauriRuntime()) return null;

  const { invoke } = await import("@tauri-apps/api/core");
  const stored = await invoke<string>("library_store_xml", {
    content,
    category: libraryCategory(documentType),
    fileName: libraryFileName(label, chave),
    existingPath: existingPath ?? null,
  });
  return typeof stored === "string" && stored ? stored : null;
}

export async function deleteFromLibrary(paths: Iterable<string>): Promise<void> {
  if (!isTauriRuntime()) return;

  const { invoke } = await import("@tauri-apps/api/core");
  for (const path of new Set(paths)) {
    try {
      await invoke("library_delete_xml", { path });
    } catch {
      // A leftover copy is harmless; the history no longer points to it.
    }
  }
}
