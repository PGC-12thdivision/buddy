"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { cambiarFocoDias } from "@/app/actions/account";
import { Sheet } from "@/components/session/sheet";
import { FocusPicker } from "@/components/wizard/pickers";
import { Cta, Note, Question, Segmented, TextButton, TextLink } from "@/components/wizard/ui";
import type { Days } from "@/lib/domain/template";
import { DAYS_OPTIONS, templateHint, type WizardAnswers } from "@/lib/wizard/answers";

export type Availability = { allowed: true } | { allowed: false; reason: "limite" | "tope_diario"; from: string };

const ERRORS: Record<string, string> = {
  conexion: "No hemos podido conectar para crear tu plan. Tu plan actual sigue igual; inténtalo de nuevo.",
  validacion: "No hemos podido crear un plan que cumpla nuestras reglas. Tu plan actual sigue igual; inténtalo de nuevo.",
  tope_diario: "Hoy ya no podemos crear más planes. Inténtalo mañana.",
  sin_cambios: "Elige otro foco u otros días para crear un plan nuevo.",
  fallo: "No hemos podido crear tu plan. Tu plan actual sigue igual; inténtalo de nuevo.",
};

function LimitNote({ availability, premium }: { availability: Exclude<Availability, { allowed: true }>; premium: boolean }) {
  if (availability.reason === "tope_diario") return <Note tone="warn" role="status">{ERRORS.tope_diario}</Note>;
  return (
    <Note tone="warn" role="status">
      <p className="m-0">
        <b>{premium ? "Has usado los cambios de este mes." : "Ya has usado el cambio de este mes."}</b>
      </p>
      <p className="m-0 mt-1">{`Podrás cambiarlo a partir del ${availability.from}.`}</p>
      {premium ? null : <p className="m-0 mt-1">Hazte premium para cambiarlo sin esperar.</p>}
    </Note>
  );
}

export function FocoDiasAjustes({
  initialFocus,
  initialDays,
  premium,
  availability: initialAvailability,
}: {
  initialFocus: WizardAnswers["focus"] | undefined;
  initialDays: Days | undefined;
  premium: boolean;
  availability: Availability;
}) {
  const router = useRouter();
  const [focus, setFocus] = useState(initialFocus);
  const [days, setDays] = useState(initialDays);
  const [availability, setAvailability] = useState(initialAvailability);
  const [sheet, setSheet] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = focus !== undefined && days !== undefined && (focus !== initialFocus || days !== initialDays);
  const close = useCallback(() => {
    if (!pending) setSheet(false);
  }, [pending]);

  async function regenerate() {
    if (!focus || !days || pending) return;
    setPending(true);
    setError(null);
    const res = await cambiarFocoDias({ focus, daysPerWeek: days });
    if (res.ok) {
      router.refresh();
      router.push("/plan");
      return;
    }
    setPending(false);
    setSheet(false);
    if (res.error === "sin_sesion") router.push("/entrar");
    else if (res.error === "sin_permiso") router.push("/consentimiento");
    else if (res.error === "limite") setAvailability({ allowed: false, reason: "limite", from: res.availableFrom });
    else if (res.error === "tope_diario") setAvailability({ allowed: false, reason: "tope_diario", from: "" });
    else setError(ERRORS[res.error] ?? ERRORS.fallo);
  }

  return (
    <>
      <Question>Tu foco</Question>
      <FocusPicker value={focus} onChange={setFocus} />
      <Question>¿Cuántos días?</Question>
      <Segmented
        label="Días por semana"
        value={days}
        onChange={setDays}
        options={DAYS_OPTIONS.map((n) => ({ value: n, text: String(n) }))}
      />
      <p className="wz-help min-h-5" role="status">
        {days ? templateHint(days) : ""}
      </p>
      {availability.allowed ? (
        <p className="wz-help">
          {premium ? "Con premium puedes cambiarlo hasta 5 veces al mes." : "Gratis puedes cambiarlo una vez al mes."} Tu historial y tus pesos
          se mantienen.
        </p>
      ) : (
        <LimitNote availability={availability} premium={premium} />
      )}
      {error ? (
        <Note tone="danger" role="alert">
          {error}
        </Note>
      ) : null}
      <Cta disabled={!changed || !availability.allowed || pending} onClick={() => setSheet(true)}>
        Crear plan nuevo
      </Cta>
      <TextLink href="/ajustes">Volver a Ajustes</TextLink>

      {sheet ? (
        <Sheet title="¿Crear un plan nuevo?" onClose={close}>
          <p>Esto crea un plan nuevo. Tu historial y tus pesos se mantienen.</p>
          {premium ? null : <p>Es tu cambio de este mes.</p>}
          <button type="button" className="wz-cta" onClick={regenerate} disabled={pending}>
            {pending ? "Creando tu plan…" : "Sí, crear plan nuevo"}
          </button>
          <TextButton onClick={close} disabled={pending}>
            Cancelar
          </TextButton>
          {pending ? (
            <p role="status">Puede tardar un poco.</p>
          ) : null}
        </Sheet>
      ) : null}
    </>
  );
}
