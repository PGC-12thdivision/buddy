import { describe, expect, it } from "vitest";
import { buildPromptPayload, PROMPT_FIELDS } from "./prompt-fields";
import { ALL_EQUIPMENT_IDS, CATALOG } from "./test-fixtures";

const base = { foco: "equilibrado", dias: 3, minutos: 60, deportes: ["padel"] };

// Perfil tal como podría llegar del servidor, con datos que nunca deben entrar en el prompt.
const withHealth = {
  ...base,
  limitaciones: ["rodilla", "hombro"],
  cribado: { articular: true, embarazo: false },
  molestias: ["prensa"],
  email: "persona@example.com",
  nombre: "Persona Ejemplo",
};

describe("PROMPT_FIELDS", () => {
  it("la lista cerrada es exactamente la de KTD19 (añadir un campo hace fallar este test)", () => {
    expect([...PROMPT_FIELDS]).toEqual(["catalogo", "foco", "dias", "minutos", "deportes", "escalas", "actividades"]);
  });
});

describe("buildPromptPayload", () => {
  it("el payload solo lleva campos de la lista cerrada", () => {
    const payload = JSON.parse(
      buildPromptPayload({ profile: withHealth, catalog: CATALOG, equipmentIds: ALL_EQUIPMENT_IDS }),
    );
    expect(Object.keys(payload).sort()).toEqual(["catalogo", "deportes", "dias", "foco", "minutos"]);
  });

  // Los valores de las zonas («rodilla») pueden aparecer en el catálogo completo (p. ej. un patrón
  // «flexion_rodilla»); que no dependan del perfil lo prueba el test byte a byte de abajo.
  it("nunca contiene limitaciones, cribado, molestias, email ni nombre", () => {
    const text = buildPromptPayload({ profile: withHealth, catalog: CATALOG, equipmentIds: ALL_EQUIPMENT_IDS });
    for (const forbidden of ["limitaciones", "cribado", "articular", "molestias", "persona@example.com", "Persona Ejemplo"]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("el catálogo del prompt no lleva articulaciones ni cargas, solo id, patrón, región y grupos", () => {
    const payload = JSON.parse(buildPromptPayload({ profile: base, catalog: CATALOG, equipmentIds: ALL_EQUIPMENT_IDS }));
    expect(payload.catalogo[0]).toEqual({
      id: "sentadilla_barra",
      patron: "sentadilla",
      region: "empuje_inferior",
      grupos: ["cuadriceps", "gluteos"],
    });
  });

  it("con limitaciones el prompt es idéntico, byte a byte, al del mismo perfil sin ellas (KTD19)", () => {
    const sin = buildPromptPayload({ profile: base, catalog: CATALOG, equipmentIds: ALL_EQUIPMENT_IDS });
    const con = buildPromptPayload({ profile: withHealth, catalog: CATALOG, equipmentIds: ALL_EQUIPMENT_IDS });
    expect(con).toBe(sin);
  });

  it("el catálogo se filtra solo por equipo", () => {
    const equipmentIds = ALL_EQUIPMENT_IDS.filter((id) => id !== "rack_barra");
    const payload = JSON.parse(buildPromptPayload({ profile: withHealth, catalog: CATALOG, equipmentIds }));
    const ids: string[] = payload.catalogo.map((e: { id: string }) => e.id);
    expect(ids).not.toContain("sentadilla_barra");
    expect(ids).toContain("prensa");
    expect(ids).toHaveLength(CATALOG.length - 1);
  });
});
