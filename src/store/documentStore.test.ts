// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn<() => Promise<string>>(),
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
});
