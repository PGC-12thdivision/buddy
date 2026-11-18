import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { serverVar } from "@/lib/env.server";
import { logError } from "@/lib/log";
import type { CallModel, ModelReply } from "./plan";

// Llamada real a la API de Anthropic, solo en servidor (guardarraíl: la clave nunca llega al
// cliente). messages.parse con salida zod (KTD6): sin tool_choice forzado, sin temperatura y sin
// prefill, que dan 400 en Sonnet 5.5. Se registran solo códigos, nunca el mensaje ni el contenido
// (KTD17).

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  // Un reintento del SDK ante 429/5xx/red; el tiempo total queda por debajo del maxDuration de la ruta.
  client ??= new Anthropic({ apiKey: serverVar("ANTHROPIC_API_KEY"), timeout: 50_000, maxRetries: 1 });
  return client;
}

export const callPlanModel: CallModel = async ({ model, system, user, schema }): Promise<ModelReply> => {
  try {
    const response = await anthropic().messages.parse({
      model,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: user }],
      // Elegir ejercicios de una lista no necesita razonamiento profundo.
      output_config: { format: zodOutputFormat(schema), effort: "medium" },
    });
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    if (response.stop_reason === "refusal") return { kind: "refused", inputTokens, outputTokens };
    if (!response.parsed_output) return { kind: "empty", inputTokens, outputTokens };
    return { kind: "parsed", output: response.parsed_output, inputTokens, outputTokens };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      logError("ia_plan", { code: `http_${error.status ?? "red"}` });
    } else {
      logError("ia_plan", error);
    }
    // Red, tiempo agotado, límite de la API o error del servidor: el intento no cuenta (D9).
    return { kind: "connection" };
  }
};
