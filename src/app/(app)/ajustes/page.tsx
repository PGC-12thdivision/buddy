import type { Route } from "next";
import Link from "next/link";
import { AppScreen, Disclaimer } from "@/components/app/screen";
import { requireAppContext } from "@/lib/app/context";
import { parseTheme } from "@/lib/theme";
import { FOCUS_LABELS, type WizardAnswers } from "@/lib/wizard/answers";
import { CuentaAcciones } from "./cuenta";
import { Preferencias } from "./preferencias";
import { SalirButton } from "./salir";

// Ajustes (diseño D15; plan.md U11; dirección B, D59: marcador "interior", sin cifra). Los 4 bloques
// con reglas de imprenta: Mi entreno, Preferencias, Suscripción y Cuenta y privacidad. En
// escritorio, 2 columnas (D24). Las zonas de las limitaciones no salen de esta pantalla (ni en la URL).

function RowLink({ href, label, value }: { href: Route; label: string; value: string }) {
  return (
    <Link href={href} className="wz-rule-row">
      <span className="font-bold">{label}</span>
      <span className="wz-rule-value text-[14px] text-muted-foreground">
        {value}
        <span aria-hidden="true">&nbsp;›</span>
      </span>
    </Link>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default async function AjustesPage() {
  const { supabase, userId, premium, trialDaysLeft } = await requireAppContext();
  const [claims, health, gym, answers, settings] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.from("health_profile").select("limitations").eq("user_id", userId).maybeSingle(),
    supabase.from("gym_profiles").select("equipment_type_ids").eq("user_id", userId).maybeSingle(),
    supabase.from("onboarding_answers").select("focus, days_per_week").eq("user_id", userId).maybeSingle(),
    supabase.from("user_settings").select("theme, show_rest_timer").eq("user_id", userId).maybeSingle(),
  ]);
  const email = typeof claims.data?.claims?.email === "string" ? claims.data.claims.email : "";
  const zones = health.data?.limitations.length ?? 0;
  const equipment = gym.data?.equipment_type_ids.length ?? 0;
  const focus = answers.data ? FOCUS_LABELS[answers.data.focus as WizardAnswers["focus"]] : null;

  return (
    <AppScreen title="Ajustes">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
        <section aria-labelledby="ajustes-entreno">
          <h2 id="ajustes-entreno" className="wz-rule-title">
            Mi entreno
          </h2>
          <RowLink href="/ajustes/limitaciones" label="Limitaciones" value={zones === 0 ? "Ninguna" : plural(zones, "zona", "zonas")} />
          <RowLink href="/ajustes/gimnasio" label="Mi gimnasio" value={plural(equipment, "tipo de equipo", "tipos de equipo")} />
          <RowLink
            href="/ajustes/foco-dias"
            label="Foco y días"
            value={focus && answers.data ? `${focus}, ${plural(answers.data.days_per_week, "día", "días")}` : "Cambiar"}
          />
        </section>
        <section aria-labelledby="ajustes-preferencias">
          <h2 id="ajustes-preferencias" className="wz-rule-title">
            Preferencias
          </h2>
          <Preferencias theme={parseTheme(settings.data?.theme)} showRestTimer={settings.data?.show_rest_timer ?? true} />
        </section>
        <section aria-labelledby="ajustes-suscripcion">
          <h2 id="ajustes-suscripcion" className="wz-rule-title">
            Suscripción
          </h2>
          <div className="wz-rule-row">
            <span>Estado</span>
            <span className="wz-rule-value font-bold">
              {premium && trialDaysLeft !== null ? `Prueba premium, ${trialDaysLeft} días` : premium ? "Premium" : "Gratis"}
            </span>
          </div>
        </section>
        <section aria-labelledby="ajustes-cuenta">
          <h2 id="ajustes-cuenta" className="wz-rule-title">
            Cuenta y privacidad
          </h2>
          <div className="wz-rule-row">
            <span>Email</span>
            <span className="min-w-0 truncate text-right text-[14px] text-muted-foreground">{email}</span>
          </div>
          <CuentaAcciones />
          <SalirButton />
        </section>
      </div>
      <Disclaimer />
    </AppScreen>
  );
}
