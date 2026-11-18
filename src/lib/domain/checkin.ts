import { madridDayKey, madridWeekKey } from "./ai-limits";

// Cuándo toca el check-in semanal (diseño D10, sistema §11.8; plan.md U8). Sin red ni hora del
// sistema: la hora entra como parámetro. La semana es de lunes a domingo, en Madrid.
// - Disponible desde que se termina la última sesión planificada de la semana, o desde el domingo
//   si quedan sesiones sin hacer, hasta el domingo a medianoche.
// - Semana sin sesiones: el domingo se abre, pero dentro sale el vacío "Aún no hay partida" (sin IA).

export type CheckinWindow = "no_toca" | "disponible" | "vacio";

export function isMadridSunday(now: Date): boolean {
  const [y, m, d] = madridDayKey(now).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}

export function checkinWindow(now: Date, daysPerWeek: number, sessionsThisWeek: number): CheckinWindow {
  if (sessionsThisWeek >= daysPerWeek) return "disponible";
  if (!isMadridSunday(now)) return "no_toca";
  return sessionsThisWeek === 0 ? "vacio" : "disponible";
}

// Lunes de la semana en Madrid como "AAAA-MM-DD": la clave de checkins.week_start.
export const checkinWeek = (now: Date): string => madridWeekKey(now);

// Lunes de esta semana a las 00:00 en Madrid, como instante (para filtrar sesiones y molestias).
export function madridWeekStart(now: Date): Date {
  const local = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  const offset = local.getTime() - now.getTime();
  const day = (local.getDay() + 6) % 7;
  local.setHours(0, 0, 0, 0);
  local.setDate(local.getDate() - day);
  return new Date(local.getTime() - offset);
}
