import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DRAWINGS } from "./exercise-drawings";

// Cada dibujo apunta a archivos que existen en public/ejercicios y a dos fotogramas distintos.
describe("DRAWINGS", () => {
  const dir = path.resolve(__dirname, "../../../public/ejercicios");
  it.each(Object.entries(DRAWINGS))("%s tiene sus dos fotogramas", (_id, d) => {
    expect(d.start).not.toBe(d.end);
    expect(fs.existsSync(path.join(dir, d.start))).toBe(true);
    expect(fs.existsSync(path.join(dir, d.end))).toBe(true);
  });

  it("los ejercicios del catálogo con dibujo existen en la migración del catálogo", () => {
    const sql = fs
      .readdirSync(path.resolve(__dirname, "../../../supabase/migrations"))
      .filter((f) => f.includes("catalogo"))
      .map((f) => fs.readFileSync(path.resolve(__dirname, "../../../supabase/migrations", f), "utf8"))
      .join("\n");
    for (const id of Object.keys(DRAWINGS)) expect(sql, id).toContain(`'${id}'`);
  });
});
