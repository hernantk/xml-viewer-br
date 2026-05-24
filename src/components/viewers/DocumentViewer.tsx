import { useDocumentStore } from "@/store/documentStore";
import { DANFEViewer } from "./DANFEViewer";
import { DACTeViewer } from "./DACTeViewer";
import { NFSeViewer } from "./NFSeViewer";
import { SpedNFSeViewer } from "./SpedNFSeViewer";
import { GenericXmlViewer } from "./GenericXmlViewer";
import { parseXml } from "@/services/xmlParser";
import { isTauriRuntime } from "@/utils/runtime";
import { AlertTriangle, Copy, Check, Download, Loader2, FileCode, Pen, Save } from "lucide-react";
import { getDocumentMeta } from "@/utils/documentMeta";
import { useState } from "react";

function formatXml(raw: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "text/xml");
    const parseError = doc.getElementsByTagName("parsererror");
    if (parseError.length > 0) return raw;
    const serializer = new XMLSerializer();
    const serialized = serializer.serializeToString(doc);
    let formatted = "";
    let indent = 0;
    const tab = "  ";
    for (let i = 0; i < serialized.length; i++) {
      const ch = serialized[i];
      if (ch === "<" && serialized[i + 1] === "/") {
        indent--;
        formatted += "\n" + tab.repeat(Math.max(0, indent));
        formatted += ch;
      } else if (ch === "<" && serialized[i + 1] === "!" && serialized[i + 2] === "[") {
        const end = serialized.indexOf("]]>", i);
        if (end === -1) { formatted += ch; continue; }
        formatted += "\n" + tab.repeat(indent) + serialized.slice(i, end + 3);
        i = end + 2;
      } else if (ch === "<" && (serialized[i + 1] === "?" || serialized[i + 1] === "!")) {
        const end = serialized.indexOf(">", i);
        formatted += "\n" + tab.repeat(indent) + serialized.slice(i, end + 1);
        i = end;
      } else if (ch === "<") {
        formatted += "\n" + tab.repeat(indent);
        formatted += ch;
        indent++;
      } else if (ch === ">" && (serialized[i - 1] === "/" || serialized[i - 1] === "?")) {
        formatted += ch;
        indent--;
      } else {
        formatted += ch;
      }
    }
    return formatted.trim();
  } catch {
    return raw;
  }
}

function EditModal({
  initialXml,
  onSave,
  onCancel,
}: {
  initialXml: string;
  onSave: (edited: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(() => formatXml(initialXml));
  const [error, setError] = useState("");

  const handleSave = () => {
    setError("");
    const trimmed = value.trim();
    if (!trimmed) {
      setError("O XML não pode estar vazio.");
      return;
    }
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, "text/xml");
      const parseErrorEl = doc.getElementsByTagName("parsererror");
      if (parseErrorEl.length > 0) {
        setError("XML inválido: " + (parseErrorEl[0].textContent || "erro de parsing"));
        return;
      }
      onSave(trimmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao validar XML");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 no-print">
      <div className="mx-4 w-full max-w-3xl rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Editar XML
          </h2>
        </div>
        <div className="p-4">
          {error && (
            <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          <textarea
            className="w-full h-[60vh] rounded border border-gray-300 bg-gray-50 p-3 font-mono text-xs leading-relaxed text-gray-800 outline-none resize-y focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-blue-500"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Aplicar edição
          </button>
        </div>
      </div>
    </div>
  );
}

export function DocumentViewer() {
  const doc = useDocumentStore((s) => s.currentDocument);
  const loading = useDocumentStore((s) => s.loading);
  const error = useDocumentStore((s) => s.error);
  const currentXml = useDocumentStore((s) => s.currentXml);
  const currentFilePath = useDocumentStore((s) => s.currentFilePath);
  const downloadDir = useDocumentStore((s) => s.downloadDir);
  const isEdited = useDocumentStore((s) => s.isEdited);
  const setDocument = useDocumentStore((s) => s.setDocument);
  const setEdited = useDocumentStore((s) => s.setEdited);
  const [copied, setCopied] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="relative">
          <Loader2 size={40} className="animate-spin text-blue-500" />
          <FileCode
            size={16}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400"
          />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Carregando documento...
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Lendo e interpretando arquivo XML
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <AlertTriangle size={48} />
        <p className="mt-3 text-lg font-medium">Erro ao carregar documento</p>
        <p className="mt-1 text-sm text-gray-500 max-w-md text-center">
          {error}
        </p>
      </div>
    );
  }

  if (!doc) return null;

  const documentMeta = getDocumentMeta(doc.documentType);
  const DocumentIcon = documentMeta.icon;

  let documentName = "Documento XML";
  if (doc.documentType === "nfe" && doc.nfe) {
    const { nNF, serie } = doc.nfe.infNFe.ide;
    documentName = `NF-e nº ${nNF} — Série ${serie}`;
  } else if (doc.documentType === "cte" && doc.cte) {
    const { nCT } = doc.cte.infCte.ide;
    documentName = `CT-e nº ${nCT}`;
  } else if (doc.documentType === "nfse" && doc.nfse) {
    const { numero } = doc.nfse.nfse.infNfse;
    documentName = `NFS-e nº ${numero}`;
  } else if (doc.documentType === "nfse-sped" && doc.spedNfse) {
    documentName = `NFS-e nº ${doc.spedNfse.infNFSe.nNFSe}`;
  } else if (doc.documentType === "xml" && currentFilePath) {
    documentName = currentFilePath.split(/[/\\]/).pop() || "Documento XML";
  }

  let chave = "";
  if (doc.documentType === "nfe" && doc.nfe) {
    chave = doc.nfe.infNFe.id.replace(/^NFe/, "");
  } else if (doc.documentType === "cte" && doc.cte) {
    chave = doc.cte.infCte.id.replace(/^CTe/, "");
  } else if (doc.documentType === "nfse" && doc.nfse) {
    chave = doc.nfse.nfse.infNfse.codigoVerificacao;
  } else if (doc.documentType === "nfse-sped" && doc.spedNfse) {
    chave = doc.spedNfse.infNFSe.id.replace(/^NFS/, "");
  }

  const handleCopyKey = async () => {
    if (!chave) return;
    await navigator.clipboard.writeText(chave);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadXml = async () => {
    if (!currentXml) return;
    const fileName = `${documentName.replace(/[^a-zA-Z0-9áéíóúãõçÁÉÍÓÚÃÕÇ _\-–—]/g, "_")}.xml`;

    try {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      if (downloadDir) {
        const sep = downloadDir.includes("\\") ? "\\" : "/";
        const filePath = `${downloadDir}${sep}${fileName}`;
        await writeTextFile(filePath, currentXml);
        setDownloadNotice(`Salvo em ${filePath}`);
        setTimeout(() => setDownloadNotice(""), 3000);
      } else {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const outputPath = await save({
          defaultPath: fileName,
          filters: [{ name: "XML", extensions: ["xml"] }],
        });
        if (outputPath) {
          await writeTextFile(outputPath, currentXml);
          setDownloadNotice(`Salvo em ${outputPath}`);
          setTimeout(() => setDownloadNotice(""), 3000);
        }
      }
    } catch {
      const blob = new Blob([currentXml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleEditSave = (editedXml: string) => {
    try {
      const newDoc = parseXml(editedXml);
      setDocument(newDoc, editedXml, currentFilePath || "editado");
      setEdited(true);
      setEditModalOpen(false);
    } catch (e) {
      const genericDoc = { documentType: "xml" as const };
      setDocument(genericDoc, editedXml, currentFilePath || "editado");
      setEdited(true);
      setEditModalOpen(false);
    }
  };

  const handleOverwriteFile = async () => {
    if (!currentXml || !currentFilePath) return;
    if (!isTauriRuntime()) {
      setSaveNotice("Sobrescrever arquivo original só está disponível no app desktop.");
      setTimeout(() => setSaveNotice(""), 3000);
      return;
    }
    if (!currentFilePath.includes("\\") && !currentFilePath.includes("/")) {
      setSaveNotice("Arquivo temporário não pode ser sobrescrito. Use Baixar XML.");
      setTimeout(() => setSaveNotice(""), 3000);
      return;
    }
    const confirmed = window.confirm(
      "Isso substituirá o arquivo XML original. Deseja continuar?"
    );
    if (!confirmed) return;

    try {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      await writeTextFile(currentFilePath, currentXml);
      setSaveNotice("Arquivo original sobrescrito com sucesso.");
      setTimeout(() => setSaveNotice(""), 3000);
    } catch {
      setSaveNotice("Erro ao sobrescrever o arquivo original.");
      setTimeout(() => setSaveNotice(""), 3000);
    }
  };

  let viewer = null;
  const viewerKey = `${doc.documentType}-${chave || "sem-chave"}`;
  switch (doc.documentType) {
    case "nfe":
      viewer = doc.nfe ? <DANFEViewer key={viewerKey} nfe={doc.nfe} /> : null;
      break;
    case "cte":
      viewer = doc.cte ? <DACTeViewer key={viewerKey} cte={doc.cte} /> : null;
      break;
    case "nfse":
      viewer = doc.nfse ? <NFSeViewer key={viewerKey} nfse={doc.nfse} /> : null;
      break;
    case "nfse-sped":
      viewer = doc.spedNfse ? <SpedNFSeViewer key={viewerKey} nfse={doc.spedNfse} /> : null;
      break;
    case "xml":
      viewer = currentXml ? <GenericXmlViewer xml={currentXml} /> : null;
      break;
  }

  const canOverwrite = currentFilePath && (currentFilePath.includes("\\") || currentFilePath.includes("/"));

  return (
    <div className="p-3 md:p-4 print:p-0">
      {editModalOpen && currentXml && (
        <EditModal
          initialXml={currentXml}
          onSave={handleEditSave}
          onCancel={() => setEditModalOpen(false)}
        />
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700 no-print">
        <div className="flex min-w-0 items-center gap-2">
          <div className="text-gray-600 dark:text-gray-300">
            <DocumentIcon size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
              {documentName}
            </p>
          </div>
        </div>
        {isEdited && (
          <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/12 dark:text-amber-300 dark:ring-amber-500/30">
            Editado
          </span>
        )}
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${documentMeta.badgeClassName}`}
        >
          {documentMeta.label}
        </span>

        {chave && (
          <button
            onClick={handleCopyKey}
            className="ml-auto flex items-center gap-1.5 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
            title={`Copiar chave: ${chave}`}
          >
            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            {copied ? "Copiado!" : "Copiar chave"}
          </button>
        )}

        {currentXml && (
          <button
            onClick={() => setEditModalOpen(true)}
            className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors ${!chave ? "ml-auto" : ""}`}
            title="Editar XML"
          >
            <Pen size={13} />
            Editar XML
          </button>
        )}

        {currentXml && (
          <button
            onClick={handleDownloadXml}
            className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors`}
            title="Baixar XML"
          >
            <Download size={13} />
            Baixar XML
          </button>
        )}

        {isEdited && canOverwrite && (
          <button
            onClick={handleOverwriteFile}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20 dark:hover:text-amber-300 transition-colors"
            title="Salvar no arquivo original"
          >
            <Save size={13} />
            Salvar original
          </button>
        )}
      </div>

      {isEdited && (
        <div className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 no-print dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          XML editado. Esta visualização não representa necessariamente o documento fiscal original.
        </div>
      )}

      <div id="document-viewer-content" className="relative">
        {viewer}
        {isEdited && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden print:opacity-40 select-none">
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[64px] font-bold text-red-500/20 whitespace-nowrap rotate-[-25deg]"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              XML EDITADO
            </div>
          </div>
        )}
      </div>

      {downloadNotice && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg no-print">
          {downloadNotice}
        </div>
      )}

      {saveNotice && (
        <div className="fixed bottom-16 right-4 z-50 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg no-print">
          {saveNotice}
        </div>
      )}
    </div>
  );
}
