import { NextResponse } from "next/server";
import { z } from "zod";
import { requestCheckin, type CheckinStatus } from "@/lib/app/checkin-core";
import { createClient } from "@/lib/supabase/server";
import { sessionUserId } from "@/lib/wizard/account";

// POST /api/checkin: check-in semanal del coach (plan.md U8; PRD §11, función 1).
// Frontera de autorización (KTD15): sesión, consentimiento vigente, cribado superado, premium y
// reserva del límite (KTD18) en el servidor; el user_id sale solo de los claims. La entrada son
// solo las dos escalas, validadas con zod: sin texto libre (D29).

// Tope de la función en Vercel (KTD10). Una reserva pendiente más antigua se da por liberada.
export const maxDuration = 120;

const inputSchema = z.object({
  sensacion: z.number().int().min(1).max(5),
  fatiga: z.number().int().min(1).max(5),
});

type Status = CheckinStatus | "sin_sesion" | "no_valido";

const HTTP: Partial<Record<Status, number>> = {
  sin_sesion: 401,
  no_valido: 400,
  sin_permiso: 403,
  solo_premium: 403,
  incompleto: 409,
  no_toca: 409,
  conexion: 503,
};

const reply = (status: Status) => NextResponse.json({ status }, { status: HTTP[status] ?? 200 });

export async function POST(request: Request) {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) return reply("sin_sesion");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply("no_valido");
  }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return reply("no_valido");

  return reply(await requestCheckin(supabase, userId, parsed.data, maxDuration));
}
