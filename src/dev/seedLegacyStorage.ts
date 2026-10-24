/**
 * Dev-only: fills localStorage the way versions before 1.7.0 did (XML content
 * inside `xmlviewer-recent-cache`), one document of each type, so the startup
 * migration into the `xmls/<tipo>/` library can be exercised.
 *
 * Enabled with `VITE_SEED_LEGACY=1` when starting `tauri dev`. IDs are fixed,
 * so running it again does not duplicate entries, and entries already moved
 * to the library are left alone.
 */

import type { DocumentType, RecentFileEntry } from "@/types/common";
import nfeXml from "./fixtures/nfe.xml?raw";
import cteXml from "./fixtures/cte.xml?raw";
import nfseXml from "./fixtures/nfse.xml?raw";
import nfseNacionalXml from "./fixtures/nfse-nacional.xml?raw";
import genericoXml from "./fixtures/generico.xml?raw";

const RECENT_FILES_KEY = "xmlviewer-recent";
const RECENT_CACHE_KEY = "xmlviewer-recent-cache";

interface SeedDocument {
  label: string;
  content: string;
  documentType: DocumentType;
  meta: Pick<RecentFileEntry, "chave" | "numero" | "cnpjEmitente" | "nomeEmitente">;
}

const SEED_DOCUMENTS: SeedDocument[] = [
  {
    label: "nfe-exemplo.xml",
    content: nfeXml,
    documentType: "nfe",
    meta: {
      chave: "NFe41260612345678000190550010000012341000012345",
      numero: "1234",
      cnpjEmitente: "12345678000190",
      nomeEmitente: "EMPRESA EXEMPLO COMERCIO LTDA",
    },
  },
  {
    label: "cte-exemplo.xml",
    content: cteXml,
    documentType: "cte",
    meta: {
      chave: "CTe41260611222333000144570010000005671000005678",
      numero: "567",
      cnpjEmitente: "11222333000144",
      nomeEmitente: "TRANSPORTES RAPIDOS LTDA",
    },
  },
  {
    label: "nfse-exemplo.xml",
    content: nfseXml,
    documentType: "nfse",
    meta: {
      chave: "A1B2C3D4",
      numero: "2026000123",
      cnpjEmitente: "12345678000190",
      nomeEmitente: "EMPRESA EXEMPLO SERVICOS LTDA",
    },
  },
  {
    label: "nfse-nacional-exemplo.xml",
    content: nfseNacionalXml,
    documentType: "nfse-sped",
    meta: {
      chave: "NFS41069022123456780001900000000000000012345678901",
      numero: "88",
      cnpjEmitente: "12345678000190",
      nomeEmitente: "EMPRESA EXEMPLO SERVICOS LTDA",
    },
  },
  {
    label: "relatorio-generico.xml",
    content: genericoXml,
    documentType: "xml",
    meta: {},
  },
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function seedLegacyStorage(): number {
  const recentFiles = readJson<RecentFileEntry[]>(RECENT_FILES_KEY, []);
  const cache = readJson<Record<string, string>>(RECENT_CACHE_KEY, {});
  const now = Date.now();
  let seeded = 0;

  SEED_DOCUMENTS.forEach((doc, index) => {
    const id = `memory:${doc.label}:seed`;
    const existing = recentFiles.find((entry) => entry.id === id);
    if (existing?.storedPath) return;

    if (!existing) {
      recentFiles.push({
        id,
        label: doc.label,
        source: "memory",
        lastOpenedAt: now - index * 60_000,
        documentType: doc.documentType,
        ...doc.meta,
      });
    }
    cache[id] = doc.content;
    seeded++;
  });

  recentFiles.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  localStorage.setItem(RECENT_CACHE_KEY, JSON.stringify(cache));
  localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recentFiles));
  return seeded;
}
