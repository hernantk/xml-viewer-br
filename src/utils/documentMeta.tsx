import type { LucideIcon } from "lucide-react";
import { FileText, Receipt, Truck } from "lucide-react";
import type { DocumentType } from "@/types/common";

interface DocumentMeta {
  icon: LucideIcon;
  label: string;
  badgeClassName: string;
}

const DOCUMENT_META: Record<DocumentType, DocumentMeta> = {
  nfe: {
    icon: FileText,
    label: "NF-e",
    badgeClassName:
      "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/12 dark:text-emerald-300 dark:ring-emerald-500/30",
  },
  cte: {
    icon: Truck,
    label: "CT-e",
    badgeClassName:
      "bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/12 dark:text-sky-300 dark:ring-sky-500/30",
  },
  nfse: {
    icon: Receipt,
    label: "NFS-e",
    badgeClassName:
      "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/12 dark:text-amber-300 dark:ring-amber-500/30",
  },
};

export function getDocumentMeta(documentType: DocumentType): DocumentMeta {
  return DOCUMENT_META[documentType];
}
