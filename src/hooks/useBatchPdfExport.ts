import { useCallback, useEffect, useMemo, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeFile } from "@tauri-apps/plugin-fs";
import type {
  BatchErrorItem,
  BatchProgress,
  BatchSummary,
  ParsedDocument,
} from "@/types/common";
import { discoverXmlFiles, pickDirectory } from "@/services/fileDiscovery";
import { parseXml } from "@/services/xmlParser";
import { generatePdfFromElement } from "@/services/pdfGenerator";
import { BatchZipBuilder } from "@/services/batchZip";
import {
  ensureZipFileName,
  getPdfBaseName,
  makeBatchZipDefaultName,
  resolveUniquePdfFileName,
} from "@/utils/documentFileNames";

const EMPTY_PROGRESS: BatchProgress = {
  total: 0,
  processed: 0,
  succeeded: 0,
  failed: 0,
};

function joinPath(dir: string, fileName: string) {
  const sep = dir.includes("\\") ? "\\" : "/";
  return `${dir}${sep}${fileName}`;
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

interface UseBatchPdfExportOptions {
  initialOutputDir: string;
}

export function useBatchPdfExport({ initialOutputDir }: UseBatchPdfExportOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [sourceDir, setSourceDir] = useState("");
  const [outputDir, setOutputDir] = useState(initialOutputDir);
  const [zipFileName, setZipFileName] = useState(() => makeBatchZipDefaultName());
  const [progress, setProgress] = useState<BatchProgress>(EMPTY_PROGRESS);
  const [currentFileName, setCurrentFileName] = useState("");
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [errors, setErrors] = useState<BatchErrorItem[]>([]);
  const [batchDocument, setBatchDocument] = useState<ParsedDocument | null>(null);
  const [validationMessage, setValidationMessage] = useState("");
  const [sourceFileCount, setSourceFileCount] = useState(0);
  const [zipBytes, setZipBytes] = useState<Uint8Array | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setOutputDir(initialOutputDir);
    setZipFileName(makeBatchZipDefaultName());
  }, [initialOutputDir, isOpen]);

  const resetBatchState = useCallback(() => {
    setIsRunning(false);
    setProgress(EMPTY_PROGRESS);
    setCurrentFileName("");
    setSummary(null);
    setErrors([]);
    setBatchDocument(null);
    setValidationMessage("");
    setSourceFileCount(0);
    setZipBytes(null);
    setSourceDir("");
    setOutputDir(initialOutputDir);
    setZipFileName(makeBatchZipDefaultName());
  }, [initialOutputDir]);

  const openModal = useCallback(() => {
    resetBatchState();
    setIsOpen(true);
  }, [resetBatchState]);

  const closeModal = useCallback(() => {
    if (isRunning) {
      return;
    }
    setIsOpen(false);
    resetBatchState();
  }, [isRunning, resetBatchState]);

  const refreshSourceDir = useCallback(async (directory: string) => {
    setValidationMessage("");
    setSummary(null);
    setErrors([]);
    setZipBytes(null);

    if (!directory) {
      setSourceFileCount(0);
      return [];
    }

    const files = await discoverXmlFiles(directory);
    setSourceFileCount(files.length);
    if (files.length === 0) {
      setValidationMessage("Nenhum arquivo XML foi encontrado na pasta selecionada.");
    }
    return files;
  }, []);

  const pickSourceDir = useCallback(async () => {
    const directory = await pickDirectory();
    if (!directory) {
      return;
    }

    setSourceDir(directory);
    try {
      await refreshSourceDir(directory);
    } catch (err) {
      setSourceFileCount(0);
      setValidationMessage(
        err instanceof Error ? err.message : "Nao foi possivel ler a pasta selecionada.",
      );
    }
  }, [refreshSourceDir]);

  const pickOutputDir = useCallback(async () => {
    const directory = await pickDirectory();
    if (directory) {
      setOutputDir(directory);
    }
  }, []);

  const persistZip = useCallback(async () => {
    if (!zipBytes) {
      throw new Error("O arquivo ZIP ainda nao foi gerado.");
    }

    const safeZipName = ensureZipFileName(zipFileName);
    if (outputDir) {
      const filePath = joinPath(outputDir, safeZipName);
      await writeFile(filePath, zipBytes);
      return filePath;
    }

    const outputPath = await save({
      defaultPath: safeZipName,
      filters: [{ name: "ZIP", extensions: ["zip"] }],
    });

    if (!outputPath) {
      return null;
    }

    await writeFile(outputPath, zipBytes);
    return outputPath;
  }, [outputDir, zipBytes, zipFileName]);

  const runBatch = useCallback(async () => {
    if (isRunning) {
      return;
    }

    if (!sourceDir) {
      setValidationMessage("Selecione uma pasta de origem para iniciar o lote.");
      return;
    }

    try {
      setIsRunning(true);
      setValidationMessage("");
      setSummary(null);

      if (zipBytes) {
        const outputPath = await persistZip();
        setSummary((prev) =>
          prev
            ? {
                ...prev,
                outputPath,
              }
            : null,
        );
        return;
      }

      const files = await refreshSourceDir(sourceDir);
      if (files.length === 0) {
        return;
      }

      const zip = new BatchZipBuilder();
      const usedNames = new Map<string, number>();
      const nextErrors: BatchErrorItem[] = [];
      let succeeded = 0;

      setErrors([]);
      setProgress({
        total: files.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
      });

      for (const [index, file] of files.entries()) {
        setCurrentFileName(file.name);

        try {
          const xmlContent = await readTextFile(file.path);
          const parsed = parseXml(xmlContent);

          setBatchDocument(parsed);
          await waitForNextPaint();

          const viewerEl = document.getElementById("batch-document-viewer-content");
          if (!viewerEl) {
            throw new Error("Superficie de renderizacao do lote nao encontrada.");
          }

          const fileName = resolveUniquePdfFileName(getPdfBaseName(parsed), usedNames);
          const pdfBytes = await generatePdfFromElement(viewerEl, fileName);
          zip.addPdf(fileName, pdfBytes);
          succeeded += 1;
        } catch (err) {
          nextErrors.push({
            fileName: file.name,
            reason: err instanceof Error ? err.message : "Falha ao processar XML.",
          });
        }

        setProgress({
          total: files.length,
          processed: index + 1,
          succeeded,
          failed: nextErrors.length,
        });
        setErrors([...nextErrors]);
      }

      setBatchDocument(null);
      setCurrentFileName("");

      if (succeeded === 0) {
        setValidationMessage("Nenhum PDF valido foi gerado a partir da pasta selecionada.");
        setSummary({
          sourceDir,
          outputPath: null,
          totalFound: files.length,
          generated: 0,
          skipped: nextErrors.length,
        });
        return;
      }

      const generatedZipBytes = await zip.toUint8Array();
      setZipBytes(generatedZipBytes);

      const safeZipName = ensureZipFileName(zipFileName);
      let outputPath: string | null = null;

      try {
        if (outputDir) {
          outputPath = joinPath(outputDir, safeZipName);
          await writeFile(outputPath, generatedZipBytes);
        } else {
          outputPath = await save({
            defaultPath: safeZipName,
            filters: [{ name: "ZIP", extensions: ["zip"] }],
          });

          if (outputPath) {
            await writeFile(outputPath, generatedZipBytes);
          }
        }
      } catch (err) {
        setValidationMessage(
          `ZIP gerado em memoria, mas falhou ao salvar: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }

      setSummary({
        sourceDir,
        outputPath,
        totalFound: files.length,
        generated: succeeded,
        skipped: nextErrors.length,
      });
    } catch (err) {
      setValidationMessage(
        err instanceof Error ? err.message : "Falha ao executar o processo em lote.",
      );
    } finally {
      setCurrentFileName("");
      setBatchDocument(null);
      setIsRunning(false);
    }
  }, [
    isRunning,
    outputDir,
    persistZip,
    refreshSourceDir,
    sourceDir,
    zipBytes,
    zipFileName,
  ]);

  const canRun = useMemo(
    () => Boolean(sourceDir) && sourceFileCount > 0 && !isRunning,
    [isRunning, sourceDir, sourceFileCount],
  );

  return {
    isOpen,
    isRunning,
    sourceDir,
    outputDir,
    zipFileName,
    progress,
    currentFileName,
    summary,
    errors,
    batchDocument,
    validationMessage,
    sourceFileCount,
    canRun,
    setZipFileName,
    setOutputDir,
    openModal,
    closeModal,
    pickSourceDir,
    pickOutputDir,
    runBatch,
    resetBatchState,
  };
}
