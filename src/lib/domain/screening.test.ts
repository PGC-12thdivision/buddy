import { describe, expect, it } from "vitest";
import { evaluateScreening, type ScreeningAnswers } from "./screening";

const allNo: ScreeningAnswers = {
  cardiaco: false,
  dolor_toracico: false,
  mareos: false,
  cronica: false,
  medicacion: false,
  articular: false,
  supervision: false,
  embarazo: false,
};

describe("evaluateScreening", () => {
  it("todo «No» pasa", () => {
    expect(evaluateScreening(allNo, [])).toEqual({ status: "apto" });
  });

  it("un «Sí» de riesgo bloquea", () => {
    expect(evaluateScreening({ ...allNo, dolor_toracico: true }, [])).toEqual({ status: "bloqueado" });
    expect(evaluateScreening({ ...allNo, supervision: true }, ["rodilla"])).toEqual({ status: "bloqueado" });
  });

  it("embarazo «Sí» bloquea", () => {
    expect(evaluateScreening({ ...allNo, embarazo: true }, [])).toEqual({ status: "bloqueado" });
  });

  it("«Sí» articular sin zona marcada exige zona; con zona, pasa", () => {
    expect(evaluateScreening({ ...allNo, articular: true }, [])).toEqual({ status: "requiere_zona" });
    expect(evaluateScreening({ ...allNo, articular: true }, ["hombro"])).toEqual({ status: "apto" });
  });

  it("una pregunta sin responder no cuenta como «No»: el cribado queda incompleto", () => {
    const sieteRespuestas: ScreeningAnswers = { ...allNo };
    delete sieteRespuestas.embarazo;
    expect(evaluateScreening(sieteRespuestas, [])).toEqual({ status: "incompleto" });
  });

  it("un riesgo bloquea aunque también haya «Sí» articular sin zona", () => {
    expect(evaluateScreening({ ...allNo, articular: true, mareos: true }, [])).toEqual({ status: "bloqueado" });
  });
});
