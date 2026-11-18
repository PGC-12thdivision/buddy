import { describe, expect, it } from "vitest";
import { loadSeedCatalog } from "@/test/seed-catalog";
import { REGIONS } from "@/lib/domain/types";
import { arrowPaths, ILLUSTRATIONS, illustrationKey, VIEWBOX } from "./illustrations";

const { after } = loadSeedCatalog();

describe("dibujos de técnica", () => {
  it("cada patrón del catálogo tiene su propio dibujo", () => {
    const patterns = [...new Set(after.map((e) => e.pattern))];
    for (const p of patterns) expect(Object.keys(ILLUSTRATIONS), p).toContain(p);
    expect(illustrationKey("press_desconocido", "brazo")).toBe("flexion_codo");
  });

  it("cada región tiene un dibujo de reserva para patrones nuevos", () => {
    for (const r of REGIONS) expect(Object.keys(ILLUSTRATIONS)).toContain(illustrationKey("patron_nuevo", r));
  });

  it("cada dibujo describe el movimiento en español y lleva al menos una flecha", () => {
    for (const [key, f] of Object.entries(ILLUSTRATIONS)) {
      expect(f.label.length, key).toBeGreaterThan(30);
      expect(f.label, key).not.toMatch(/·/);
      expect(f.arrows.length, key).toBeGreaterThan(0);
    }
  });

  it("todo cabe en el lienzo", () => {
    const inside = (x: number, y: number) => x >= 0 && x <= VIEWBOX.width && y >= 0 && y <= VIEWBOX.height;
    for (const [key, f] of Object.entries(ILLUSTRATIONS)) {
      const paths = [...("props" in f ? f.props : []), ...("ghost" in f ? f.ghost : []), ...f.body];
      for (const d of paths) {
        const nums = [...d.matchAll(/-?\d+(\.\d+)?/g)].map((m) => Number(m[0]));
        for (const n of nums) expect(n >= 0 && n <= VIEWBOX.width, `${key}: ${d}`).toBe(true);
      }
      expect(inside(...f.head), key).toBe(true);
      for (const a of f.arrows) for (const p of a.points) expect(inside(...p), key).toBe(true);
    }
  });
});

describe("flechas", () => {
  it("una flecha recta hacia arriba lleva la punta en el extremo final", () => {
    const { line, heads } = arrowPaths({ points: [[10, 50], [10, 20]] });
    expect(line).toBe("M10 50L10 20");
    expect(heads).toHaveLength(1);
    // Las alas quedan por debajo de la punta y a los dos lados.
    expect(heads[0]).toMatch(/^M\d+(\.\d)? 25\.3L10 20L\d+(\.\d)? 25\.3$/);
  });

  it("una curva usa el punto de control y la doble punta sale en los dos extremos", () => {
    const { line, heads } = arrowPaths({ points: [[0, 0], [10, 10], [20, 0]], both: true });
    expect(line).toBe("M0 0Q10 10 20 0");
    expect(heads).toHaveLength(2);
    expect(heads[0]).toContain("L20 0");
    expect(heads[1]).toContain("L0 0");
  });
});
