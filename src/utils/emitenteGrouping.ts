import type { RecentFileEntry } from "@/types/common";
import { formatCNPJorCPF } from "@/utils/formatters";

export interface EmitenteGroup {
  key: string;
  nomeEmitente: string;
  cnpjEmitente?: string;
  /** Maior lastOpenedAt entre os arquivos do grupo (último acesso/atividade). */
  lastActivity: number;
  hasPinned: boolean;
  files: RecentFileEntry[];
}

function onlyDigits(value?: string): string {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeName(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Chave estável de agrupamento: CNPJ/CPF normalizado tem prioridade,
 * depois o nome normalizado. Arquivos sem emitente caem em "sem-emitente".
 */
export function getEmitenteGroupKey(entry: RecentFileEntry): string {
  const doc = onlyDigits(entry.cnpjEmitente);
  if (doc.length > 0) return `doc:${doc}`;
  const name = normalizeName(entry.nomeEmitente);
  if (name.length > 0) return `nome:${name}`;
  return "sem-emitente";
}

/**
 * Mostra só uma parte do documento para identificação, sem expor tudo.
 * CNPJ (14 dígitos): "12.345.678/0001-**" (oculta DV).
 * CPF (11 dígitos): "123.456.***-**".
 */
export function formatPartialDoc(doc?: string): string {
  const digits = onlyDigits(doc);
  if (digits.length === 14) {
    const root = digits.slice(0, 8);
    const filial = digits.slice(8, 12);
    const formattedRoot = `${root.slice(0, 2)}.${root.slice(2, 5)}.${root.slice(5, 8)}`;
    return `${formattedRoot}/${filial}-**`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.***-**`;
  }
  if (digits.length >= 4) {
    return `${doc?.trim().slice(0, 6)}***`;
  }
  return doc?.trim() ?? "";
}

/** Texto completo para o tooltip (nome + documento formatado). */
export function getEmitenteTooltip(group: Pick<EmitenteGroup, "nomeEmitente" | "cnpjEmitente">): string {
  const fullDoc = group.cnpjEmitente ? formatCNPJorCPF(group.cnpjEmitente) : "";
  if (group.nomeEmitente && fullDoc) return `${group.nomeEmitente} • ${fullDoc}`;
  return group.nomeEmitente || fullDoc || "Emitente desconhecido";
}

function pickDisplayName(files: RecentFileEntry[]): string {
  // Prefere o nome do arquivo mais recente do grupo (última atividade).
  const sorted = [...files].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  for (const file of sorted) {
    const name = (file.nomeEmitente ?? "").trim();
    if (name) return name;
  }
  return "Emitente desconhecido";
}

function pickDisplayDoc(files: RecentFileEntry[]): string | undefined {
  const sorted = [...files].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  for (const file of sorted) {
    if (file.cnpjEmitente?.trim()) return file.cnpjEmitente.trim();
  }
  return undefined;
}

function sortGroupFiles(files: RecentFileEntry[]): RecentFileEntry[] {
  return [...files].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.lastOpenedAt - a.lastOpenedAt;
  });
}

/**
 * Agrupa arquivos por empresa emitente.
 * - Grupos ordenados: primeiro os que têm fixados, depois pelo último
 *   acesso/atividade (maior lastOpenedAt do grupo).
 * - Arquivos dentro do grupo: fixados primeiro, depois último acesso.
 */
export function groupByEmitente(entries: RecentFileEntry[]): EmitenteGroup[] {
  const byKey = new Map<string, RecentFileEntry[]>();
  for (const entry of entries) {
    const key = getEmitenteGroupKey(entry);
    const list = byKey.get(key);
    if (list) list.push(entry);
    else byKey.set(key, [entry]);
  }

  const groups: EmitenteGroup[] = [...byKey.entries()].map(([key, files]) => {
    const sortedFiles = sortGroupFiles(files);
    return {
      key,
      nomeEmitente: pickDisplayName(files),
      cnpjEmitente: pickDisplayDoc(files),
      lastActivity: files.reduce((max, f) => Math.max(max, f.lastOpenedAt || 0), 0),
      hasPinned: files.some((f) => f.pinned),
      files: sortedFiles,
    };
  });

  groups.sort((a, b) => {
    if (a.hasPinned && !b.hasPinned) return -1;
    if (!a.hasPinned && b.hasPinned) return 1;
    if (b.lastActivity !== a.lastActivity) return b.lastActivity - a.lastActivity;
    return a.nomeEmitente.localeCompare(b.nomeEmitente, "pt-BR");
  });

  return groups;
}
