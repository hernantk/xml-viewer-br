// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mocks.invoke,
}));

import { isNfeDownloadSupported, isTauriRuntime } from "./runtime";

type WindowWithTauri = Window & {
  __TAURI_INTERNALS__?: { invoke?: () => void };
};

describe("runtime capabilities", () => {
  beforeEach(() => {
    delete (window as WindowWithTauri).__TAURI_INTERNALS__;
    mocks.invoke.mockReset();
  });

  it("não consulta capacidades fora do Tauri", async () => {
    expect(isTauriRuntime()).toBe(false);
    await expect(isNfeDownloadSupported()).resolves.toBe(false);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("consulta a capacidade nativa no desktop", async () => {
    (window as WindowWithTauri).__TAURI_INTERNALS__ = { invoke: () => undefined };
    mocks.invoke.mockResolvedValue(true);

    expect(isTauriRuntime()).toBe(true);
    await expect(isNfeDownloadSupported()).resolves.toBe(true);
    expect(mocks.invoke).toHaveBeenCalledWith("nfe_download_supported");
  });

  it("trata falha de IPC como recurso indisponível", async () => {
    (window as WindowWithTauri).__TAURI_INTERNALS__ = { invoke: () => undefined };
    mocks.invoke.mockRejectedValue(new Error("IPC indisponível"));

    await expect(isNfeDownloadSupported()).resolves.toBe(false);
  });
});
