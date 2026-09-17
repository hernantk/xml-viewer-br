// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isTauriRuntime: vi.fn(() => true),
  appDataDir: vi.fn(async () => "C:\\app-data\\"),
  mkdir: vi.fn(async () => undefined),
  readTextFile: vi.fn<() => Promise<string>>(),
  writeTextFile: vi.fn(async () => undefined),
}));

vi.mock("@/utils/runtime", () => ({
  isTauriRuntime: mocks.isTauriRuntime,
}));

vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: mocks.appDataDir,
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  mkdir: mocks.mkdir,
  readTextFile: mocks.readTextFile,
  writeTextFile: mocks.writeTextFile,
}));

import { restoreIfNeeded } from "./persistentStorage";

describe("persistentStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.isTauriRuntime.mockReturnValue(true);
    mocks.readTextFile.mockReset();
    mocks.writeTextFile.mockClear();
    mocks.mkdir.mockClear();
  });

  it("restaura apenas as chaves ausentes", async () => {
    localStorage.setItem("xmlviewer-recent", "dados-locais");
    mocks.readTextFile.mockResolvedValue(
      JSON.stringify({
        "xmlviewer-recent": "backup-antigo",
        "xmlviewer-recent-cache": "cache-restaurado",
        "xmlviewer-theme": "dark",
      }),
    );

    await restoreIfNeeded();

    expect(localStorage.getItem("xmlviewer-recent")).toBe("dados-locais");
    expect(localStorage.getItem("xmlviewer-recent-cache")).toBe(
      "cache-restaurado",
    );
    expect(localStorage.getItem("xmlviewer-theme")).toBe("dark");
  });

  it("preserva uma configuração local mais recente que o backup", async () => {
    localStorage.setItem("xmlviewer-theme", "dark");
    mocks.readTextFile.mockResolvedValue(
      JSON.stringify({ "xmlviewer-theme": "light" }),
    );

    await restoreIfNeeded();

    expect(localStorage.getItem("xmlviewer-theme")).toBe("dark");
  });

  it("ignora valores persistidos que não sejam strings", async () => {
    mocks.readTextFile.mockResolvedValue(
      JSON.stringify({
        "xmlviewer-theme": { value: "dark" },
        "xmlviewer-max-recent": 500,
      }),
    );

    await restoreIfNeeded();

    expect(localStorage.getItem("xmlviewer-theme")).toBeNull();
    expect(localStorage.getItem("xmlviewer-max-recent")).toBeNull();
  });

  it("não acessa o filesystem fora do Tauri", async () => {
    mocks.isTauriRuntime.mockReturnValue(false);

    await restoreIfNeeded();

    expect(mocks.readTextFile).not.toHaveBeenCalled();
    expect(mocks.writeTextFile).not.toHaveBeenCalled();
  });

  it("não sobrescreve o backup quando a leitura falha", async () => {
    localStorage.setItem("xmlviewer-recent", "dados-locais");
    mocks.readTextFile.mockRejectedValue(new Error("arquivo temporariamente bloqueado"));

    await restoreIfNeeded();

    expect(mocks.writeTextFile).not.toHaveBeenCalled();
    expect(localStorage.getItem("xmlviewer-recent")).toBe("dados-locais");
  });

  it("não grava novamente quando nenhuma chave precisa ser restaurada", async () => {
    const keys = [
      "xmlviewer-recent",
      "xmlviewer-recent-cache",
      "xmlviewer-theme",
      "xmlviewer-max-recent",
      "xmlviewer-download-dir",
      "xmlviewer-group-by-emitente",
      "xmlviewer-selected-cert",
    ];
    keys.forEach((key) => localStorage.setItem(key, "valor"));

    await restoreIfNeeded();

    expect(mocks.readTextFile).not.toHaveBeenCalled();
    expect(mocks.writeTextFile).not.toHaveBeenCalled();
  });

  it("restaura sem escrever quando usado por uma janela auxiliar", async () => {
    mocks.readTextFile.mockResolvedValue(
      JSON.stringify({ "xmlviewer-theme": "dark" }),
    );

    await restoreIfNeeded({ writeBack: false });

    expect(localStorage.getItem("xmlviewer-theme")).toBe("dark");
    expect(mocks.writeTextFile).not.toHaveBeenCalled();
  });
});
