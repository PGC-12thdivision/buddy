"use client";

import { useEffect } from "react";
import { applyTheme, THEME_COOKIE, THEME_COOKIE_MAX_AGE, type Theme } from "@/lib/theme";

// Alinea la cookie del tema con user_settings (fuente de verdad) cuando la cuenta se abre en otro
// dispositivo o la cookie caducó; con "Como el sistema", sigue los cambios del sistema.
export function ThemeSync({ theme }: { theme: Theme }) {
  useEffect(() => {
    const current = document.cookie.split("; ").find((c) => c.startsWith(`${THEME_COOKIE}=`))?.split("=")[1];
    if (current !== theme) {
      document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
    }
    applyTheme(theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);
  return null;
}
