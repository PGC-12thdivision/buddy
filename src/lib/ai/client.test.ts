import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { aiErrorCode } from "./client";

// El log de la IA dice el motivo con un código seguro, nunca con el mensaje (KTD17).
describe("aiErrorCode", () => {
  const key = "sk-ant-prueba";

  it("distingue la clave ausente o guardada con espacios o comillas", () => {
    expect(aiErrorCode(new Error("x"), undefined)).toBe("sin_clave");
    expect(aiErrorCode(new Error("x"), `${key}\n`)).toBe("clave_con_espacios_o_comillas");
    expect(aiErrorCode(new Error("x"), `"${key}"`)).toBe("clave_con_espacios_o_comillas");
  });

  it("da el estado HTTP de la API y separa red y tiempo agotado", () => {
    const unauthorized = new Anthropic.AuthenticationError(401, undefined, "no", new Headers());
    expect(aiErrorCode(unauthorized, key)).toBe("http_401");
    expect(aiErrorCode(new Anthropic.APIConnectionError({ message: "x" }), key)).toBe("sin_red");
    expect(aiErrorCode(new Anthropic.APIConnectionTimeoutError(), key)).toBe("tiempo_agotado");
  });

  it("de otras excepciones solo da el tipo, nunca el mensaje", () => {
    expect(aiErrorCode(new TypeError("datos privados"), key)).toBe("excepcion_TypeError");
    expect(aiErrorCode("texto suelto", key)).toBe("desconocido");
  });
});
