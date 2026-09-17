// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

async function importStore() {
  const { useViewerStore, ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN } = await import(
    "./viewerStore"
  );
  return { useViewerStore, ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN };
}

describe("viewerStore zoom", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it("inicia em 100% quando não há valor salvo", async () => {
    const { useViewerStore, ZOOM_DEFAULT } = await importStore();
    expect(useViewerStore.getState().zoom).toBe(ZOOM_DEFAULT);
  });

  it("zoomIn / zoomOut respeitam limites e persistem", async () => {
    const { useViewerStore, ZOOM_MAX, ZOOM_MIN } = await importStore();
    const store = useViewerStore;

    store.getState().setZoom(ZOOM_MAX);
    store.getState().zoomIn();
    expect(store.getState().zoom).toBe(ZOOM_MAX);

    store.getState().setZoom(ZOOM_MIN);
    store.getState().zoomOut();
    expect(store.getState().zoom).toBe(ZOOM_MIN);

    expect(localStorage.getItem("xmlviewer-zoom")).toBe(String(ZOOM_MIN));
  });

  it("resetZoom volta para 100%", async () => {
    const { useViewerStore, ZOOM_DEFAULT } = await importStore();
    const store = useViewerStore;

    store.getState().setZoom(1.5);
    expect(store.getState().zoom).toBe(1.5);
    store.getState().resetZoom();
    expect(store.getState().zoom).toBe(ZOOM_DEFAULT);
  });

  it("setZoom fixa valores fora do intervalo", async () => {
    const { useViewerStore, ZOOM_MAX, ZOOM_MIN } = await importStore();
    const store = useViewerStore;

    store.getState().setZoom(99);
    expect(store.getState().zoom).toBe(ZOOM_MAX);
    store.getState().setZoom(-5);
    expect(store.getState().zoom).toBe(ZOOM_MIN);
  });
});
