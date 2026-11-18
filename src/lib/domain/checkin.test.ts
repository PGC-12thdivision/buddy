import { describe, expect, it } from "vitest";
import { checkinWeek, checkinWindow, isMadridSunday, madridWeekStart } from "./checkin";

// 2026-11-18 es miércoles; 2026-11-22, domingo.
const wednesday = new Date("2026-11-18T10:00:00Z");
const sunday = new Date("2026-11-22T10:00:00Z");

describe("checkinWindow (diseño D10)", () => {
  it("no toca a mitad de semana con sesiones pendientes", () => {
    expect(checkinWindow(wednesday, 3, 1)).toBe("no_toca");
  });

  it("se abre al terminar la última sesión planificada, aunque no sea domingo", () => {
    expect(checkinWindow(wednesday, 3, 3)).toBe("disponible");
  });

  it("el domingo se abre aunque queden sesiones sin hacer", () => {
    expect(checkinWindow(sunday, 3, 1)).toBe("disponible");
  });

  it("semana sin sesiones: el domingo sale el vacío; antes, nada", () => {
    expect(checkinWindow(sunday, 3, 0)).toBe("vacio");
    expect(checkinWindow(wednesday, 3, 0)).toBe("no_toca");
  });

  it("el domingo cuenta en hora de Madrid (domingo 23:30 en Madrid es domingo; lunes 00:30 ya no)", () => {
    expect(isMadridSunday(new Date("2026-11-22T22:30:00Z"))).toBe(true);
    expect(isMadridSunday(new Date("2026-11-22T23:30:00Z"))).toBe(false);
  });
});

describe("semana del check-in", () => {
  it("la clave es el lunes de la semana en Madrid", () => {
    expect(checkinWeek(wednesday)).toBe("2026-11-16");
    expect(checkinWeek(sunday)).toBe("2026-11-16");
    expect(checkinWeek(new Date("2026-11-22T23:30:00Z"))).toBe("2026-11-23");
  });

  it("el inicio de la semana es el lunes a las 00:00 de Madrid", () => {
    expect(madridWeekStart(wednesday).toISOString()).toBe("2026-11-15T23:00:00.000Z");
  });
});
