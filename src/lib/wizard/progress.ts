// Pantalla a la que va una cuenta con sesión (al entrar, al confirmar el email o si abre una
// pantalla que aún no le toca). Orden de sistema §11.12: consentimiento, limitaciones y
// cribado, resumen. Sin consentimiento vigente no se pasa del consentimiento (guardarraíl 8).

export type AccountProgress = { hasConsent: boolean; hasHealthProfile: boolean; hasActivePlan: boolean };

export function nextScreenForAccount(progress: AccountProgress): "/consentimiento" | "/limitaciones" | "/resumen" | "/hoy" {
  if (!progress.hasConsent) return "/consentimiento";
  if (!progress.hasHealthProfile) return "/limitaciones";
  // Con plan, la app empieza en Hoy (diseño D3).
  return progress.hasActivePlan ? "/hoy" : "/resumen";
}
