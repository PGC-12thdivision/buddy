// Tema (diseño D15, Preferencias; DESIGN.md D61). La fuente de verdad es user_settings.theme; una
// cookie con el mismo valor deja que el layout raíz pinte la clase .dark en <html> desde el primer
// byte, sin destello. No es un dato personal: solo "light", "dark" o "system".

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = "buddy-tema";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const THEME_LABELS: Record<Theme, string> = { light: "Claro", dark: "Oscuro", system: "Como el sistema" };

export const parseTheme = (value: string | undefined | null): Theme =>
  THEMES.includes(value as Theme) ? (value as Theme) : "light";

// "Como el sistema": se decide en el navegador antes de pintar.
export const SYSTEM_THEME_SCRIPT =
  "try{if(window.matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark')}catch(e){}";

// Aplica el tema en el navegador (al cambiarlo en Ajustes o al sincronizar otro dispositivo).
export function applyTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}
