// @vitest-environment jsdom

import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useRightButtonPan } from "./useRightButtonPan";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let scroller: HTMLElement | null = null;
let content: HTMLElement | null = null;

function Harness() {
  const ref = useRef<HTMLDivElement>(null);
  useRightButtonPan(ref);
  return (
    <main data-testid="scroller">
      <div ref={ref} data-testid="content">
        <span>nota</span>
      </div>
    </main>
  );
}

function dispatchMouse(
  target: EventTarget,
  type: string,
  init: MouseEventInit = {},
): MouseEvent {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

describe("useRightButtonPan", () => {
  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<Harness />);
    });
    scroller = document.querySelector("main");
    content = document.querySelector('[data-testid="content"]');
    if (!scroller || !content) throw new Error("Harness não renderizou");
    scroller.scrollLeft = 50;
    scroller.scrollTop = 40;
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    container?.remove();
    root = null;
    container = null;
    scroller = null;
    content = null;
  });

  it("arrasta com o botão direito e rola o container", () => {
    dispatchMouse(content!, "pointerdown", { button: 2, clientX: 100, clientY: 100, pointerId: 1 } as MouseEventInit);
    dispatchMouse(window, "pointermove", { clientX: 120, clientY: 130, pointerId: 1 } as MouseEventInit);
    dispatchMouse(window, "pointerup", { button: 2, pointerId: 1 } as MouseEventInit);

    // Arrastou +20px no X e +30px no Y: o scroll anda o inverso.
    expect(scroller!.scrollLeft).toBe(30);
    expect(scroller!.scrollTop).toBe(10);
  });

  it("engole o contextmenu só quando houve arrasto", () => {
    // Com arrasto: menu suprimido.
    dispatchMouse(content!, "pointerdown", { button: 2, clientX: 100, clientY: 100 } as MouseEventInit);
    dispatchMouse(window, "pointermove", { clientX: 130, clientY: 100 } as MouseEventInit);
    dispatchMouse(window, "pointerup", { button: 2 } as MouseEventInit);
    const afterDrag = dispatchMouse(content!, "contextmenu", { button: 2 });
    expect(afterDrag.defaultPrevented).toBe(true);

    // Clique simples (sem arrasto): menu preservado.
    dispatchMouse(content!, "pointerdown", { button: 2, clientX: 100, clientY: 100 } as MouseEventInit);
    dispatchMouse(window, "pointerup", { button: 2 } as MouseEventInit);
    const afterClick = dispatchMouse(content!, "contextmenu", { button: 2 });
    expect(afterClick.defaultPrevented).toBe(false);
  });

  it("ignora o botão esquerdo e o do meio", () => {
    dispatchMouse(content!, "pointerdown", { button: 0, clientX: 100, clientY: 100 } as MouseEventInit);
    dispatchMouse(window, "pointermove", { clientX: 200, clientY: 200 } as MouseEventInit);
    dispatchMouse(window, "pointerup", { button: 0 } as MouseEventInit);

    dispatchMouse(content!, "pointerdown", { button: 1, clientX: 100, clientY: 100 } as MouseEventInit);
    dispatchMouse(window, "pointermove", { clientX: 200, clientY: 200 } as MouseEventInit);
    dispatchMouse(window, "pointerup", { button: 1 } as MouseEventInit);

    expect(scroller!.scrollLeft).toBe(50);
    expect(scroller!.scrollTop).toBe(40);
  });

  it("não afeta o menu de contexto da barra lateral", () => {
    const outside = document.createElement("div");
    document.body.appendChild(outside);
    try {
      dispatchMouse(content!, "pointerdown", { button: 2, clientX: 100, clientY: 100 } as MouseEventInit);
      dispatchMouse(window, "pointermove", { clientX: 130, clientY: 100 } as MouseEventInit);
      dispatchMouse(window, "pointerup", { button: 2 } as MouseEventInit);
      const sidebarMenu = dispatchMouse(outside, "contextmenu", { button: 2 });
      expect(sidebarMenu.defaultPrevented).toBe(false);
    } finally {
      outside.remove();
    }
  });
});
