"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { darConsentimiento } from "../actions";
import { Cta, Note, TextLink, WizardScreen } from "@/components/wizard/ui";
import { useStepView, useWizard } from "@/components/wizard/wizard-provider";

// Pantalla 7 (PRD §5.7, sistema §11.12; guardarraíl 8): casilla sin premarcar antes de cualquier
// dato de salud, con salida clara (diseño D14).
export function ConsentimientoForm() {
  useStepView("consentimiento");
  const router = useRouter();
  const { track } = useWizard();
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit() {
    setPending(true);
    setFailed(false);
    const result = await darConsentimiento({ accepted });
    if (result.ok) {
      track("wizard_completada", "consentimiento");
      router.push("/limitaciones");
      return;
    }
    setPending(false);
    if (result.error === "sin_sesion") router.push("/entrar");
    else setFailed(true);
  }

  return (
    <WizardScreen
      step={7}
      title="Tus datos de salud"
      subtitle="Antes de preguntarte nada de salud, tu permiso."
      footer={
        <>
          <Cta disabled={!accepted || pending} onClick={submit}>
            Siguiente
          </Cta>
          <TextLink href="/sin-datos-de-salud">No quiero dar estos datos</TextLink>
        </>
      }
    >
      <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[15px]">
        <li>
          <b>Qué datos:</b> las zonas que te limitan y si puedes entrenar sin supervisión (8 preguntas de seguridad). Del cuestionario solo
          guardamos el resultado, no tus respuestas.
        </li>
        <li>
          <b>Para qué:</b> generar y ajustar tu plan para que no incluya ejercicios que carguen esas zonas.
        </li>
        <li>
          <b>Quién los trata:</b> tu plan lo prepara la IA de Anthropic, fuera de la UE, pero tus datos de salud nunca se le envían: los
          aplicamos nosotros después.
        </li>
        <li>
          <b>Cómo retirarlo:</b> cuando quieras, en Ajustes. Al retirarlo borramos tus datos de salud.
        </li>
      </ul>
      <label className="mt-2 flex min-h-11 cursor-pointer items-start gap-3 border-y-2 border-foreground py-3 text-[15px] font-bold">
        <input type="checkbox" className="wz-check mt-0.5" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        Acepto que BUDDY trate mis limitaciones y el resultado del cuestionario de seguridad para generar y ajustar mi plan.
      </label>
      {failed ? (
        <Note tone="danger" role="alert">
          No hemos podido guardar tu consentimiento. Inténtalo de nuevo.
        </Note>
      ) : null}
    </WizardScreen>
  );
}
