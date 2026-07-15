// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  html2canvas: vi.fn(async () => ({
    width: 2382,
    height: 1000,
    toDataURL: () => "data:image/jpeg;base64,test",
  })),
  setPage: vi.fn(),
  text: vi.fn(),
}));

vi.mock("html2canvas", () => ({
  default: mocks.html2canvas,
}));

vi.mock("jspdf", () => ({
  jsPDF: class {
    private pageCount = 1;

    addPage() {
      this.pageCount += 1;
      return this;
    }

    addImage() {
      return this;
    }

    getNumberOfPages() {
      return this.pageCount;
    }

    setPage(page: number) {
      mocks.setPage(page);
      return this;
    }

    setFont() {
      return this;
    }

    setFontSize() {
      return this;
    }

    setTextColor() {
      return this;
    }

    text(...args: unknown[]) {
      mocks.text(...args);
      return this;
    }

    output() {
      return new ArrayBuffer(0);
    }
  },
}));

import { generatePdfFromElement } from "./pdfGenerator";

describe("generatePdfFromElement", () => {
  beforeEach(() => {
    mocks.html2canvas.mockClear();
    mocks.setPage.mockClear();
    mocks.text.mockClear();
  });

  it("aplica a marca de edição em todas as páginas", async () => {
    const element = document.createElement("div");
    element.innerHTML = '<section class="danfe-page"></section><section class="danfe-page"></section>';

    await generatePdfFromElement(element, "documento", { edited: true });

    expect(mocks.setPage.mock.calls.map(([page]) => page)).toEqual([1, 2]);
    expect(mocks.text).toHaveBeenCalledTimes(2);
    expect(mocks.text).toHaveBeenCalledWith(
      "XML EDITADO",
      105,
      148.5,
      expect.objectContaining({ align: "center" }),
    );
  });

  it("não aplica marca em documento original", async () => {
    const element = document.createElement("div");
    element.innerHTML = '<section class="danfe-page"></section>';

    await generatePdfFromElement(element, "documento");

    expect(mocks.text).not.toHaveBeenCalled();
  });
});
