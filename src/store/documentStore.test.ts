// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn<(cmd: string, args?: Record<string, unknown>) => Promise<string>>(),
  persistToFile: vi.fn(async () => undefined),
}));

vi.mock("@/utils/runtime", () => ({
  isTauriRuntime: () => true,
}));

vi.mock("@/utils/persistentStorage", () => ({
  persistToFile: mocks.persistToFile,
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mocks.invoke,
}));

const FILE_PATH = "C:\\documentos\\nota.xml";
const STALE_XML = "<arquivo><versao>antiga</versao></arquivo>";
const FRESH_XML = "<arquivo><versao>atual</versao></arquivo>";

async function importStore() {
  const { useDocumentStore } = await import("./documentStore");
  return useDocumentStore;
}

describe("documentStore recent file cache", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    mocks.invoke.mockReset();
    mocks.persistToFile.mockClear();
  });

  it("relê do disco e remove snapshots legados de arquivos normais", async () => {
    localStorage.setItem(
      "xmlviewer-recent",
      JSON.stringify([
        {
          id: FILE_PATH,
          label: "nota.xml",
          source: "filesystem",
          lastOpenedAt: 1,
        },
      ]),
    );
    localStorage.setItem(
      "xmlviewer-recent-cache",
      JSON.stringify({ [FILE_PATH]: STALE_XML }),
    );
    mocks.invoke.mockResolvedValue(FRESH_XML);

    const store = await importStore();
    const result = await store.getState().getRecentFileContent(FILE_PATH);

    expect(result).toEqual({ content: FRESH_XML, edited: false });
    expect(mocks.invoke).toHaveBeenCalledWith("read_file", { path: FILE_PATH });
    expect(JSON.parse(localStorage.getItem("xmlviewer-recent-cache") ?? "{}"))
      .toEqual({});
  });

  it("usa a cópia interna quando o arquivo original foi removido", async () => {
    localStorage.setItem(
      "xmlviewer-recent",
      JSON.stringify([
        {
          id: FILE_PATH,
          label: "nota.xml",
          source: "filesystem",
          lastOpenedAt: 1,
        },
      ]),
    );
    mocks.invoke
      .mockRejectedValueOnce(new Error("Arquivo não encontrado"))
      .mockResolvedValueOnce(FRESH_XML);

    const store = await importStore();

    await expect(
      store.getState().getRecentFileContent(FILE_PATH),
    ).resolves.toEqual({ content: FRESH_XML, edited: false });
    expect(mocks.invoke).toHaveBeenNthCalledWith(2, "read_cached_document", {
      fileId: FILE_PATH,
    });
  });

  it("encerra o loading quando os comandos de leitura não respondem", async () => {
    vi.useFakeTimers();
    mocks.invoke.mockImplementation(() => new Promise<string>(() => {}));

    try {
      const store = await importStore();
      const loading = store.getState().loadFile(FILE_PATH);

      await vi.advanceTimersByTimeAsync(30_001);
      await loading;

      expect(store.getState().loading).toBe(false);
      expect(store.getState().error).toContain("cópia interna");
    } finally {
      vi.useRealTimers();
    }
  });

  it("preserva o conteúdo e a proveniência de um rascunho editado", async () => {
    localStorage.setItem(
      "xmlviewer-recent",
      JSON.stringify([
        {
          id: FILE_PATH,
          label: "nota.xml",
          source: "filesystem",
          lastOpenedAt: 1,
          edited: true,
        },
      ]),
    );
    localStorage.setItem(
      "xmlviewer-recent-cache",
      JSON.stringify({ [FILE_PATH]: STALE_XML }),
    );

    const store = await importStore();
    const result = await store.getState().getRecentFileContent(FILE_PATH);

    expect(result).toEqual({ content: STALE_XML, edited: true });
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("mantém no cache somente imports em memória durante carga mista", async () => {
    const memoryId = "memory:upload.xml:1";
    const store = await importStore();

    await store.getState().loadMultipleFiles([
      { id: FILE_PATH, content: FRESH_XML },
      { id: memoryId, content: STALE_XML },
    ]);

    expect(JSON.parse(localStorage.getItem("xmlviewer-recent-cache") ?? "{}"))
      .toEqual({ [memoryId]: STALE_XML });
    await vi.waitFor(() =>
      expect(mocks.invoke).toHaveBeenCalledWith(
        "library_store_xml",
        expect.objectContaining({ content: FRESH_XML, fileName: "nota.xml" }),
      ),
    );
    expect(mocks.invoke).not.toHaveBeenCalledWith("cache_document", expect.anything());
  });

  it("persiste conteúdo e sinalização de edição atomicamente", async () => {
    const store = await importStore();

    store
      .getState()
      .setDocument({ documentType: "xml" }, STALE_XML, FILE_PATH, true);

    expect(store.getState().isEdited).toBe(true);
    expect(store.getState().recentFiles[0]?.edited).toBe(true);
    await expect(store.getState().getRecentFileContent(FILE_PATH)).resolves.toEqual({
      content: STALE_XML,
      edited: true,
    });
  });

  it("não persiste metadados de edição quando o cache excede a quota", async () => {
    const store = await importStore();
    const originalSetItem = Storage.prototype.setItem;
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(function (this: Storage, key: string, value: string) {
        if (key === "xmlviewer-recent-cache") {
          throw new DOMException("Quota excedida", "QuotaExceededError");
        }
        return originalSetItem.call(this, key, value);
      });

    try {
      expect(() =>
        store
          .getState()
          .setDocument({ documentType: "xml" }, STALE_XML, FILE_PATH, true),
      ).toThrow("Quota excedida");
      expect(localStorage.getItem("xmlviewer-recent")).toBeNull();
    } finally {
      setItem.mockRestore();
    }
  });

  it("restaura o cache anterior quando os metadados não podem ser gravados", async () => {
    const store = await importStore();
    localStorage.setItem("xmlviewer-recent-cache", JSON.stringify({ anterior: STALE_XML }));
    const originalSetItem = Storage.prototype.setItem;
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(function (this: Storage, key: string, value: string) {
        if (key === "xmlviewer-recent") {
          throw new DOMException("Quota excedida", "QuotaExceededError");
        }
        return originalSetItem.call(this, key, value);
      });

    try {
      expect(() =>
        store
          .getState()
          .setDocument(
            { documentType: "xml" },
            STALE_XML,
            "memory:editado.xml:1",
            true,
          ),
      ).toThrow("Quota excedida");
      expect(JSON.parse(localStorage.getItem("xmlviewer-recent-cache") ?? "{}"))
        .toEqual({ anterior: STALE_XML });
    } finally {
      setItem.mockRestore();
    }
  });

  it("copia imports para a biblioteca e tira o conteúdo do cache", async () => {
    const memoryId = "memory:upload.xml:1";
    const storedPath = "C:/AppData/xmls/outros/upload.xml";
    mocks.invoke.mockImplementation(async (cmd) =>
      cmd === "library_store_xml" ? storedPath : "",
    );
    const useDocumentStore = await importStore();

    await useDocumentStore.getState().loadMultipleFiles([{ id: memoryId, content: STALE_XML }]);
    await vi.waitFor(() =>
      expect(useDocumentStore.getState().recentFiles[0]?.storedPath).toBe(storedPath),
    );

    expect(mocks.invoke).toHaveBeenCalledWith("library_store_xml", {
      content: STALE_XML,
      category: "outros",
      fileName: "upload.xml",
      existingPath: null,
    });
    expect(JSON.parse(localStorage.getItem("xmlviewer-recent-cache") ?? "{}")).toEqual({});
  });

  it("lê da biblioteca e apaga a cópia ao remover do histórico", async () => {
    const storedPath = "C:/AppData/xmls/nfe/nota.xml";
    localStorage.setItem(
      "xmlviewer-recent",
      JSON.stringify([
        { id: FILE_PATH, label: "nota.xml", source: "filesystem", lastOpenedAt: 1, storedPath },
      ]),
    );
    mocks.invoke.mockImplementation(async (cmd, args) =>
      cmd === "read_file" && args?.path === storedPath ? FRESH_XML : "",
    );

    const store = await importStore();
    await expect(store.getState().getRecentFileContent(FILE_PATH)).resolves.toEqual({
      content: FRESH_XML,
      edited: false,
    });

    store.getState().removeRecentFile(FILE_PATH);
    await vi.waitFor(() =>
      expect(mocks.invoke).toHaveBeenCalledWith("library_delete_xml", { path: storedPath }),
    );
  });

  it("migra o cache do localStorage para a biblioteca na inicialização", async () => {
    const memoryId = "memory:antigo.xml:1";
    const storedPath = "C:/AppData/xmls/outros/antigo.xml";
    localStorage.setItem(
      "xmlviewer-recent",
      JSON.stringify([{ id: memoryId, label: "antigo.xml", source: "memory", lastOpenedAt: 1 }]),
    );
    localStorage.setItem("xmlviewer-recent-cache", JSON.stringify({ [memoryId]: STALE_XML }));
    mocks.invoke.mockImplementation(async (cmd, args) => {
      if (cmd === "library_store_xml") return storedPath;
      if (cmd === "read_file" && args?.path === storedPath) return STALE_XML;
      return "";
    });

    const { useDocumentStore, migrateRecentFilesToLibrary } = await import("./documentStore");
    await migrateRecentFilesToLibrary();

    expect(useDocumentStore.getState().recentFiles[0]?.storedPath).toBe(storedPath);
    expect(JSON.parse(localStorage.getItem("xmlviewer-recent-cache") ?? "{}")).toEqual({});
    await expect(
      useDocumentStore.getState().getRecentFileContent(memoryId),
    ).resolves.toEqual({ content: STALE_XML, edited: false });
  });

  it("migra cópias do document-cache antigo e limpa a origem", async () => {
    const storedPath = "C:/AppData/xmls/outros/nota.xml";
    localStorage.setItem(
      "xmlviewer-recent",
      JSON.stringify([
        { id: FILE_PATH, label: "nota.xml", source: "filesystem", lastOpenedAt: 1 },
      ]),
    );
    mocks.invoke.mockImplementation(async (cmd, args) => {
      if (cmd === "read_file") throw new Error("arquivo removido");
      if (cmd === "read_cached_document" && args?.fileId === FILE_PATH) return FRESH_XML;
      if (cmd === "library_store_xml") return storedPath;
      return "";
    });

    const { useDocumentStore, migrateRecentFilesToLibrary } = await import("./documentStore");
    await migrateRecentFilesToLibrary();

    expect(useDocumentStore.getState().recentFiles[0]?.storedPath).toBe(storedPath);
    expect(mocks.invoke).toHaveBeenCalledWith(
      "library_store_xml",
      expect.objectContaining({ content: FRESH_XML }),
    );
    expect(mocks.invoke).toHaveBeenCalledWith("remove_cached_document", { fileId: FILE_PATH });
  });

  it("não aumenta o limite por arquivos que falham durante a importação", async () => {
    const store = await importStore();
    store.getState().setMaxRecentFiles(2);

    const result = await store.getState().loadMultipleFiles([
      { id: "C:\\documentos\\invalida-1.xml", content: "<nfe>" },
      { id: "C:\\documentos\\invalida-2.xml", content: "<nfe>" },
      { id: "C:\\documentos\\invalida-3.xml", content: "<nfe>" },
    ]);

    expect(result).toMatchObject({
      loaded: 0,
      skipped: 3,
      limitIncreased: false,
      newLimit: 2,
    });
    expect(store.getState().maxRecentFiles).toBe(2);
  });

  it("preserva a nota aberta quando todo o lote importado é inválido", async () => {
    const store = await importStore();
    store.getState().setDocument(
      { documentType: "xml" },
      FRESH_XML,
      FILE_PATH,
    );

    const result = await store.getState().loadMultipleFiles([
      { id: "C:\\documentos\\invalida.xml", content: "<nfe>" },
    ]);

    expect(result).toMatchObject({ loaded: 0, skipped: 1 });
    expect(store.getState().currentFilePath).toBe(FILE_PATH);
    expect(store.getState().currentXml).toBe(FRESH_XML);
    expect(store.getState().loading).toBe(false);
  });

  it("gera IDs distintos para arquivos em memória com o mesmo nome", async () => {
    const { createMemoryFileId } = await import("./documentStore");
    vi.spyOn(Date, "now").mockReturnValue(123);

    expect(createMemoryFileId("nota.xml")).not.toBe(
      createMemoryFileId("nota.xml"),
    );
  });

  it("limpa o histórico e o cache sem fechar a nota atual", async () => {
    const store = await importStore();
    const memoryId = "memory:nota.xml:1";
    store.getState().setDocument(
      { documentType: "xml" },
      FRESH_XML,
      memoryId,
    );

    store.getState().clearRecentFiles();

    expect(store.getState().recentFiles).toEqual([]);
    expect(store.getState().currentFilePath).toBe(memoryId);
    expect(store.getState().currentXml).toBe(FRESH_XML);
    expect(localStorage.getItem("xmlviewer-recent")).toBe("[]");
    expect(localStorage.getItem("xmlviewer-recent-cache")).toBe("{}");
    await vi.waitFor(() => {
      expect(mocks.invoke).toHaveBeenCalledWith("clear_document_cache");
    });
  });

  it("encerra o loading se a persistência do lote falhar", async () => {
    const store = await importStore();
    const originalSetItem = Storage.prototype.setItem;
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(function (this: Storage, key: string, value: string) {
        if (key === "xmlviewer-recent-cache") {
          throw new DOMException("Quota excedida", "QuotaExceededError");
        }
        return originalSetItem.call(this, key, value);
      });

    try {
      await expect(
        store.getState().loadMultipleFiles([
          { id: "memory:lote.xml:1", content: FRESH_XML },
        ]),
      ).rejects.toThrow("Quota excedida");
      expect(store.getState().loading).toBe(false);
      expect(store.getState().error).toContain("Quota excedida");
    } finally {
      setItem.mockRestore();
    }
  });

  it("encerra o loading se não puder aumentar o limite", async () => {
    const store = await importStore();
    store.getState().setMaxRecentFiles(1);
    const originalSetItem = Storage.prototype.setItem;
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(function (this: Storage, key: string, value: string) {
        if (key === "xmlviewer-max-recent") {
          throw new DOMException("Quota excedida", "QuotaExceededError");
        }
        return originalSetItem.call(this, key, value);
      });

    try {
      await expect(
        store.getState().loadMultipleFiles([
          { id: "memory:1.xml:1", content: FRESH_XML },
          { id: "memory:2.xml:2", content: FRESH_XML },
        ]),
      ).rejects.toThrow("Quota excedida");
      expect(store.getState().loading).toBe(false);
      expect(store.getState().error).toContain("Quota excedida");
    } finally {
      setItem.mockRestore();
    }
  });
});
