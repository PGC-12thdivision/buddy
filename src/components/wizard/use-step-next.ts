"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { actualizarRespuestas } from "@/app/(wizard)/actions";
import type { WizardAnswers } from "@/lib/wizard/answers";
import type { WizardEvent } from "@/lib/wizard/events";
import { useWizard } from "./wizard-provider";

// "Siguiente" de las pantallas de respuestas sin salud (foco, experiencia, semana, deportes,
// gimnasio). Antes del registro guarda en el borrador; desde el resumen ("Cambiar"), en la cuenta.
export function useStepNext(step: WizardEvent["step"], nextHref: Route, editing: boolean) {
  const router = useRouter();
  const { draft, setAnswers, track } = useWizard();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function next(patch: Partial<WizardAnswers>) {
    setAnswers(patch);
    track("wizard_completada", step);
    if (!editing) {
      router.push(nextHref);
      return;
    }
    setPending(true);
    setError(null);
    // Todas las respuestas que tiene el borrador, no solo las de esta pantalla: si a la cuenta le
    // falta alguna (registro a medias), el servidor puede completarla en vez de devolver "incompleto".
    const result = await actualizarRespuestas({ ...draft.answers, ...patch });
    setPending(false);
    if (result.ok) router.push("/resumen");
    else if (result.error === "sin_sesion") router.push("/entrar");
    else setError("No hemos podido guardar el cambio. Inténtalo de nuevo.");
  }

  return { next, pending, error };
}
