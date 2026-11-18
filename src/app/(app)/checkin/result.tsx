"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { aplicarAjuste, mantenerPlan } from "@/app/actions/checkin";
import { AppScreen, Disclaimer, Tag } from "@/components/app/screen";
import { Cta, CtaLink, Note, SecondaryButton } from "@/components/wizard/ui";

// Resultado del check-in (sistema §7: cambios con su porqué + lo que hicieron las reglas; diseño D17:
// el título lo monta el código). El usuario manda (sistema §10): "Aplicar a mi semana" crea una
// versión nueva del plan tras revalidarla en el servidor; "Mantener mi plan" no cambia nada.

export type ChangeView = {
  key: string;
  day: string;
  name: string;
  before: string | null;
  sets: string;
  setsBefore: string | null;
  why: string;
  byRules: boolean;
};

const ERRORS: Record<string, string> = {
  desfasado: "Tu plan ha cambiado desde el check-in (por ejemplo, al cambiar tu equipo o tus limitaciones). Este ajuste ya no se puede aplicar.",
  no_valido: "Este ajuste ya no pasa las reglas de seguridad con tus datos de hoy. No hemos cambiado nada.",
  solo_premium: "Aplicar el ajuste es premium. Tu plan sigue igual.",
  ya_decidido: "Ya habías decidido sobre este ajuste.",
};

export function CheckinResult({
  title,
  explanation,
  changes,
  rules,
  applied,
  premium,
}: {
  title: string;
  explanation: string;
  changes: ChangeView[];
  rules: string[];
  applied: boolean | null;
  premium: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"aplicar" | "mantener" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(kind: "aplicar" | "mantener") {
    if (pending) return;
    setPending(kind);
    setError(null);
    const res = kind === "aplicar" ? await aplicarAjuste() : await mantenerPlan();
    setPending(null);
    if (res.ok) return router.refresh();
    if (res.error === "sin_sesion") return router.push("/entrar");
    setError(ERRORS[res.error] ?? "No hemos podido guardar tu decisión. Inténtalo de nuevo.");
    if (res.error === "ya_decidido") router.refresh();
  }

  const footer =
    applied === true ? (
      <CtaLink href="/plan">Ver mi plan</CtaLink>
    ) : applied === false ? (
      <CtaLink href="/hoy">Volver a Hoy</CtaLink>
    ) : (
      <>
        <Cta onClick={() => decide("aplicar")} disabled={pending !== null || !premium} aria-busy={pending === "aplicar"}>
          {pending === "aplicar" ? "Aplicando…" : "Aplicar a mi semana"}
        </Cta>
        <SecondaryButton onClick={() => decide("mantener")} disabled={pending !== null} aria-busy={pending === "mantener"}>
          Mantener mi plan
        </SecondaryButton>
      </>
    );

  return (
    <AppScreen kicker="Tu ajuste" title={title} tags={<Tag premium>Premium</Tag>} footer={footer}>
      {applied === true ? (
        <Note tone="ok" role="status">
          Aplicado: tu plan ya tiene la versión nueva.
        </Note>
      ) : applied === false ? (
        <Note role="status">Mantienes tu plan. No hemos cambiado nada.</Note>
      ) : null}
      {error ? (
        <Note tone="danger" role="alert">
          {error}
        </Note>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
        <section aria-labelledby="checkin-coach">
          <h2 id="checkin-coach" className="wz-rule-title">
            Tu coach
          </h2>
          <p className="m-0 py-3 text-[17px]">{explanation}</p>
        </section>
        <section aria-labelledby="checkin-reglas">
          <h2 id="checkin-reglas" className="wz-rule-title">
            Lo que hicieron las reglas
          </h2>
          <ul className="m-0 list-none p-0">
            {rules.map((line) => (
              <li key={line} className="wz-rule-row py-2 text-[15px]">
                {line}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section aria-labelledby="checkin-cambios">
        <h2 id="checkin-cambios" className="wz-rule-title">
          Los cambios
        </h2>
        {changes.length === 0 ? (
          <p className="m-0 py-3 text-[15px]">Ningún cambio: tu plan ya encaja con tu semana.</p>
        ) : (
          <ol className="m-0 list-none p-0">
            {changes.map((c, i) => (
              <li key={c.key} className="wz-num-row py-2">
                <span className="wz-num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[13px] text-muted-foreground">{c.day}</span>
                  <b>{c.name}</b>
                  {c.before ? <span className="text-[14px] text-muted-foreground">{`En lugar de ${c.before}`}</span> : null}
                  <span className="text-[14px]">
                    {c.byRules ? <span className="font-bold">Reglas: </span> : null}
                    {c.why}
                  </span>
                </span>
                <span className="wz-num-val">
                  <b>{c.sets}</b>
                  {c.setsBefore ? <span>{c.setsBefore}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <Disclaimer />
    </AppScreen>
  );
}
