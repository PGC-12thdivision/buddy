import { describe, expect, it } from "vitest";
import { radioKeyMove } from "./radio";

describe("radioKeyMove", () => {
  it("sin respuesta, la flecha solo mueve el foco: nunca marca una opción (diseño D6)", () => {
    // Seguridad: Sí/No sin responder, foco en «Sí» (0). Ninguna flecha puede registrar «Sí».
    expect(radioKeyMove(2, -1, 0, "ArrowRight")).toEqual({ index: 1, select: false });
    expect(radioKeyMove(2, -1, 0, "ArrowLeft")).toEqual({ index: 1, select: false });
  });

  it("parte del botón con foco y da la vuelta en los dos extremos", () => {
    expect(radioKeyMove(4, -1, 3, "ArrowDown")).toEqual({ index: 0, select: false });
    expect(radioKeyMove(4, -1, 0, "ArrowUp")).toEqual({ index: 3, select: false });
  });

  it("con una respuesta ya elegida, la flecha mueve y selecciona (patrón radiogroup)", () => {
    expect(radioKeyMove(4, 1, 1, "ArrowDown")).toEqual({ index: 2, select: true });
    expect(radioKeyMove(4, 1, 1, "ArrowLeft")).toEqual({ index: 0, select: true });
  });

  it("sin foco dentro del grupo parte de la opción elegida", () => {
    expect(radioKeyMove(3, 2, -1, "ArrowRight")).toEqual({ index: 0, select: true });
  });

  it("otras teclas no hacen nada", () => {
    expect(radioKeyMove(3, 0, 0, "Tab")).toBeNull();
    expect(radioKeyMove(0, -1, -1, "ArrowRight")).toBeNull();
  });
});
