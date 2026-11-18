import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { EmailLogStore, LogStatus } from "./send";

// Acceso a datos de los emails con el cliente admin (email_log no tiene políticas: solo servidor).
// El user_id siempre viene de los claims, de la respuesta de Supabase o del listado de auth,
// nunca de la entrada del usuario (KTD16).

type Admin = ReturnType<typeof createAdminClient>;

export function emailLogStore(admin: Admin): EmailLogStore {
  return {
    async status(userId, kind, period) {
      const { data, error } = await admin
        .from("email_log")
        .select("status")
        .eq("user_id", userId)
        .eq("kind", kind)
        .eq("period", period)
        .maybeSingle();
      if (error) throw error;
      return (data?.status as LogStatus | undefined) ?? null;
    },
    async record({ userId, kind, period, status, errorCode }) {
      const { error } = await admin
        .from("email_log")
        .upsert(
          { user_id: userId, kind, period, status, error_code: errorCode, updated_at: new Date().toISOString() },
          { onConflict: "user_id,kind,period" },
        );
      if (error) throw error;
    },
  };
}

// Email de un usuario con la dirección ya confirmada; null si no la tiene confirmada.
export async function confirmedEmail(admin: Admin, userId: string): Promise<string | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw error;
  const user = data.user;
  return user?.email && user.email_confirmed_at ? user.email : null;
}

export type Candidate = { id: string; email: string; createdAt: string };

// Usuarios con email confirmado. Se recorre el listado de auth por páginas.
export async function confirmedUsers(admin: Admin): Promise<Candidate[]> {
  const perPage = 1000;
  const users: Candidate[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const user of data.users) {
      if (user.email && user.email_confirmed_at) users.push({ id: user.id, email: user.email, createdAt: user.created_at });
    }
    if (data.users.length < perPage) return users;
  }
}

// Fin de la última sesión terminada del usuario, o null si no ha terminado ninguna.
export async function lastFinishedSession(admin: Admin, userId: string): Promise<string | null> {
  const { data, error } = await admin
    .from("workout_sessions")
    .select("ended_at")
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.ended_at ?? null;
}
