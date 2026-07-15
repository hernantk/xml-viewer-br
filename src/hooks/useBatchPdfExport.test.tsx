// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const mocks = vi.hoisted(() => ({
  discoverXmlFiles: vi.fn(),
  pickDirectory: vi.fn(async () => "C:\\xmls"),
}));

vi.mock("@/services/fileDiscovery", () => ({
  discoverXmlFiles: mocks.discoverXmlFiles,
  pickDirectory: mocks.pickDirectory,
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
  writeFile: vi.fn(),
}));

import { useBatchPdfExport } from "./useBatchPdfExport";

type BatchHook = ReturnType<typeof useBatchPdfExport>;

let latest: BatchHook | null = null;
let root: Root | null = null;
let container: HTMLDivElement | null = null;

function Harness() {
  latest = useBatchPdfExport({ initialOutputDir: "" });
  return null;
}

function getLatest() {
  if (!latest) throw new Error("Hook não renderizado");
  return latest;
}

describe("useBatchPdfExport", () => {
  beforeEach(async () => {
    latest = null;
    mocks.discoverXmlFiles.mockReset();
    mocks.pickDirectory.mockClear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<Harness />);
    });
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    container?.remove();
    root = null;
    container = null;
  });

  it("reescaneia a origem ao incluir subpastas", async () => {
    mocks.discoverXmlFiles.mockImplementation(
      async (_directory: string, recursive: boolean) =>
        recursive
          ? [{ name: "subpasta.xml", path: "C:\\xmls\\sub\\subpasta.xml" }]
          : [],
    );

    await act(async () => {
      getLatest().openModal();
    });
    await act(async () => {
      await getLatest().pickSourceDir();
    });

    expect(getLatest().sourceFileCount).toBe(0);
    expect(getLatest().canRun).toBe(false);

    await act(async () => {
      await getLatest().changeIncludeSubfolders(true);
    });

    expect(mocks.discoverXmlFiles).toHaveBeenLastCalledWith("C:\\xmls", true);
    expect(getLatest().sourceFileCount).toBe(1);
    expect(getLatest().canRun).toBe(true);
  });
});
