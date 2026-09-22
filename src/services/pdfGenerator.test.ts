// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  html2canvas: vi.fn(async (_element: HTMLElement, _options?: unknown) => ({
    width: 2382,
    height: 1000,
    toDataURL: (type = "image/png") => `data:${type};base64,test`,
  })),
  setPage: vi.fn(),
  text: vi.fn(),
  addImage: vi.fn(),
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

    addImage(...args: unknown[]) {
      mocks.addImage(...args);
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
    mocks.addImage.mockClear();
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

  it("usa PNG para preservar textos pequenos e linhas finas", async () => {
    const element = document.createElement("div");
    element.innerHTML = '<section class="danfe-page"></section>';

    await generatePdfFromElement(element, "documento");

    expect(mocks.addImage).toHaveBeenCalledWith(
      expect.stringContaining("data:image/png"),
      "PNG",
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("preserva os fundos e ajusta a métrica vertical dos campos no clone da DANFE", async () => {
    const element = document.createElement("div");
    element.innerHTML = `
      <section class="danfe-page">
        <div data-danfe-section-title class="bg-gray-200">Título</div>
        <div data-danfe-field>
          <div data-danfe-field-value class="text-[10pt]">Valor</div>
        </div>
      </section>`;

    await generatePdfFromElement(element, "documento");

    const capturedPage = mocks.html2canvas.mock.calls[0]?.[0] as HTMLElement;
    const title = capturedPage.querySelector<HTMLElement>(".bg-gray-200");
    const field = capturedPage.querySelector<HTMLElement>("[data-danfe-field]");
    const value = capturedPage.querySelector<HTMLElement>("[data-danfe-field-value]");

    expect(title?.style.backgroundColor).toBe("");
    expect(title?.style.paddingBottom).toBe("2pt");
    expect(field?.style.paddingBottom).toBe("3pt");
    expect(value?.style.fontSize).toBe("8.5pt");
    expect(value?.style.top).toBe("-1.5pt");
    expect(mocks.html2canvas.mock.calls[0]?.[1]).not.toEqual(
      expect.objectContaining({ foreignObjectRendering: true }),
    );
  });

  it("mantém títulos, cabeçalho e rastreabilidade afastados das bordas no Linux", async () => {
    const element = document.createElement("div");
    element.innerHTML = `
      <section class="danfe-page">
        <div data-danfe-section-title><span data-danfe-section-title-text>Título</span></div>
        <table>
          <thead><tr><th data-danfe-product-heading><span data-danfe-product-heading-text>Código<br>Produto</span></th></tr></thead>
          <tbody><tr><td data-danfe-product-description><div>Lote-1</div></td></tr></tbody>
        </table>
      </section>`;

    await generatePdfFromElement(element, "documento");

    const capturedPage = mocks.html2canvas.mock.calls[0]?.[0] as HTMLElement;
    const title = capturedPage.querySelector<HTMLElement>("[data-danfe-section-title]");
    const titleText = capturedPage.querySelector<HTMLElement>("[data-danfe-section-title-text]");
    const heading = capturedPage.querySelector<HTMLElement>("[data-danfe-product-heading]");
    const headingText = capturedPage.querySelector<HTMLElement>("[data-danfe-product-heading-text]");
    const description = capturedPage.querySelector<HTMLElement>("[data-danfe-product-description]");

    expect(title?.style.top).toBe("");
    expect(titleText?.style.top).toBe("-2pt");
    expect(heading?.style.paddingBottom).toBe("3pt");
    expect(headingText?.style.top).toBe("-2pt");
    expect(description?.style.paddingBottom).toBe("4pt");
    expect(description?.style.lineHeight).toBe("1.25");
  });

  it("corrige a base das duplicatas e do rodapé do cabeçalho no Linux", async () => {
    const element = document.createElement("div");
    element.innerHTML = `
      <section class="danfe-page">
        <div data-danfe-header-footer>Folha 1/2</div>
        <div data-danfe-header-protocol>Protocolo</div>
        <div data-danfe-duplicate><div data-danfe-duplicate-value>10.668,25</div></div>
      </section>`;

    await generatePdfFromElement(element, "documento");

    const capturedPage = mocks.html2canvas.mock.calls[0]?.[0] as HTMLElement;
    expect(capturedPage.querySelector<HTMLElement>("[data-danfe-header-footer]")?.style.top).toBe("-2pt");
    expect(capturedPage.querySelector<HTMLElement>("[data-danfe-header-protocol]")?.style.top).toBe("-1.5pt");
    expect(capturedPage.querySelector<HTMLElement>("[data-danfe-duplicate]")?.style.paddingBottom).toBe("4pt");
    expect(capturedPage.querySelector<HTMLElement>("[data-danfe-duplicate-value]")?.style.top).toBe("-2pt");
  });
});
