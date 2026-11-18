import { z } from "zod";

// Validación de variables de entorno (plan.md, U1). Los mensajes de error nombran la variable,
// nunca su valor. Las funciones reciben el origen como parámetro para poder probarlas.

type Source = Record<string, string | undefined>;

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith("sb_publishable_"),
});

// D26: solo las claves nuevas de Supabase (sb_secret_…), nunca la legacy service_role.
const serverSchema = publicSchema.extend({
  SUPABASE_SECRET_KEY: z.string().startsWith("sb_secret_"),
});

export type OptionalServerVar =
  | "ANTHROPIC_API_KEY"
  | "STRIPE_SECRET_KEY"
  | "STRIPE_WEBHOOK_SECRET"
  | "STRIPE_PRICE_ID"
  | "RESEND_API_KEY"
  | "CRON_SECRET";

function fail(error: z.ZodError): never {
  const names = [...new Set(error.issues.map((issue) => issue.path.join(".")))];
  throw new Error(`Variables de entorno ausentes o no válidas: ${names.join(", ")}`);
}

export function parsePublicEnv(source: Source) {
  const result = publicSchema.safeParse(source);
  if (!result.success) fail(result.error);
  return {
    supabaseUrl: result.data.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: result.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function parseServerEnv(source: Source) {
  const result = serverSchema.safeParse(source);
  if (!result.success) fail(result.error);
  return {
    ...parsePublicEnv(source),
    supabaseSecretKey: result.data.SUPABASE_SECRET_KEY,
  };
}

// Variables que solo necesitan algunas unidades (IA, Stripe, Resend, cron): se piden al usarlas
// y fallan cerradas si faltan.
export function requireServerVar(source: Source, name: OptionalServerVar): string {
  const value = source[name];
  if (!value) throw new Error(`Variable de entorno ausente: ${name}`);
  return value;
}

// Las NEXT_PUBLIC_* se leen con acceso literal para que Next las incruste en el cliente.
export const publicEnv = () =>
  parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
