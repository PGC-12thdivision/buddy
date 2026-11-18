"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { registrarEvento } from "@/app/(wizard)/actions";
import type { ScreeningAnswers } from "@/lib/domain/screening";
import type { Joint } from "@/lib/domain/types";
import type { WizardAnswers } from "@/lib/wizard/answers";
import { loadDraft, recordStep, saveDraft, type Draft } from "@/lib/wizard/draft";
import type { WizardEvent } from "@/lib/wizard/events";

// Estado del wizard en el navegador.
// - Respuestas sin salud: borrador en localStorage hasta el registro (KTD4).
// - Limitaciones y cribado: solo en memoria mientras dura el wizard; nunca en el dispositivo
//   (guardarraíl 8). Se envían una vez, con consentimiento vigente, al terminar el cribado.

type WizardContextValue = {
  signedIn: boolean;
  ready: boolean;
  draft: Draft;
  setAnswers: (patch: Partial<WizardAnswers>) => void;
  track: (name: WizardEvent["name"], step: WizardEvent["step"]) => void;
  clearEvents: () => void;
  limitations: Joint[] | null;
  setLimitations: (limitations: Joint[]) => void;
  screening: ScreeningAnswers;
  setScreening: (answers: ScreeningAnswers) => void;
};

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>({ answers: {}, events: [] });
  const [ready, setReady] = useState(false);
  const [limitations, setLimitations] = useState<Joint[] | null>(null);
  const [screening, setScreening] = useState<ScreeningAnswers>({});

  // El borrador se lee después de montar para que el HTML del servidor y el del cliente coincidan.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de localStorage tras montar
    setDraft(loadDraft(window.localStorage));
    setReady(true);
  }, []);

  const update = useCallback((change: (current: Draft) => Draft) => {
    setDraft((current) => {
      const next = change(current);
      saveDraft(window.localStorage, next);
      return next;
    });
  }, []);

  const setAnswers = useCallback(
    (patch: Partial<WizardAnswers>) => update((current) => ({ ...current, answers: { ...current.answers, ...patch } })),
    [update],
  );

  const track = useCallback(
    (name: WizardEvent["name"], step: WizardEvent["step"]) => {
      if (signedIn) {
        void registrarEvento({ name, step });
        return;
      }
      update((current) => recordStep(current, name, step, new Date()));
    },
    [signedIn, update],
  );

  const clearEvents = useCallback(() => update((current) => ({ ...current, events: [] })), [update]);

  const value = useMemo(
    () => ({ signedIn, ready, draft, setAnswers, track, clearEvents, limitations, setLimitations, screening, setScreening }),
    [signedIn, ready, draft, setAnswers, track, clearEvents, limitations, screening],
  );
  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValue {
  const value = useContext(WizardContext);
  if (!value) throw new Error("useWizard fuera de WizardProvider");
  return value;
}

// Evento "vista" de una pantalla, una vez por montaje.
export function useStepView(step: WizardEvent["step"]) {
  const { ready, track } = useWizard();
  const done = useRef(false);
  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    track("wizard_vista", step);
  }, [ready, step, track]);
}

export function StepView({ step }: { step: WizardEvent["step"] }) {
  useStepView(step);
  return null;
}
