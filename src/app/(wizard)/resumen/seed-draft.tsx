"use client";

import { useEffect } from "react";
import { useWizard } from "@/components/wizard/wizard-provider";
import type { WizardAnswers } from "@/lib/wizard/answers";

// Copia en el borrador las respuestas guardadas en la cuenta, para que "Cambiar" parta de ellas
// aunque la cuenta se haya confirmado en otro navegador. Solo respuestas sin salud.
export function SeedDraft({ answers }: { answers: Partial<WizardAnswers> }) {
  const { ready, setAnswers } = useWizard();
  const key = JSON.stringify(answers);
  useEffect(() => {
    if (ready) setAnswers(JSON.parse(key) as Partial<WizardAnswers>);
  }, [ready, key, setAnswers]);
  return null;
}
