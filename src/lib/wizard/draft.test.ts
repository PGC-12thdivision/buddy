import { describe, expect, it } from "vitest";
import { DRAFT_KEY, loadDraft, recordStep, saveDraft, type Draft } from "./draft";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    raw: (key: string) => data.get(key),
  };
}

describe("borrador del wizard en el dispositivo", () => {
  it("sin nada guardado empieza con Equilibrado (PRD §5) y nada más elegido", () => {
    expect(loadDraft(memoryStorage())).toEqual({ answers: { focus: "equilibrado" }, events: [] });
  });

  it("guarda y recupera las respuestas", () => {
    const storage = memoryStorage();
    const draft: Draft = { answers: { focus: "fuerza", experience: "nunca", daysPerWeek: 3 }, events: [] };
    saveDraft(storage, draft);
    expect(loadDraft(storage)).toEqual(draft);
  });

  it("descarta cualquier campo de salud aunque alguien lo meta a mano en el almacenamiento", () => {
    const storage = memoryStorage({
      [DRAFT_KEY]: JSON.stringify({
        answers: { focus: "musculo", limitations: ["rodilla"], screening: { cardiaco: true } },
        events: [],
        limitations: ["hombro"],
      }),
    });
    const loaded = loadDraft(storage);
    expect(loaded.answers).toEqual({ focus: "musculo" });
    expect(JSON.stringify(loaded)).not.toMatch(/rodilla|hombro|cardiaco|limitations|screening/);
  });

  it("un valor no válido se ignora sin perder el resto", () => {
    const storage = memoryStorage({
      [DRAFT_KEY]: JSON.stringify({ answers: { focus: "fuerza", daysPerWeek: 9 }, events: [] }),
    });
    expect(loadDraft(storage).answers).toEqual({ focus: "fuerza" });
  });

  it("un borrador corrupto vuelve al inicial", () => {
    expect(loadDraft(memoryStorage({ [DRAFT_KEY]: "{no es json" })).answers).toEqual({ focus: "equilibrado" });
  });

  it("anota los pasos del embudo con nombres de la lista cerrada y un máximo de 40", () => {
    let draft: Draft = { answers: {}, events: [] };
    for (let i = 0; i < 45; i++) draft = recordStep(draft, "wizard_vista", "foco", new Date(Date.UTC(2026, 10, 18, 9, 0, i)));
    expect(draft.events).toHaveLength(40);
    expect(draft.events[0]).toEqual({ name: "wizard_vista", step: "foco", at: "2026-11-18T09:00:05.000Z" });
  });
});
