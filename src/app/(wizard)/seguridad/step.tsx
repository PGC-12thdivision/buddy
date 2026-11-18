"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { guardarSeguridad, salir } from "../actions";
import { Cta, Note, SecondaryButton, Segmented, TextButton, WizardScreen } from "@/components/wizard/ui";
import { useStepView, useWizard } from "@/components/wizard/wizard-provider";
import { SCREENING_QUESTIONS, type ScreeningQuestion } from "@/lib/domain/screening";

// Pantalla 9, cribado (PRD §13; guardarraíl 5; diseño D6). Ninguna respuesta viene marcada y
// Siguiente espera a las 8. El bloqueo se muestra aquí mismo, sin cambiar de URL, para que el
// resultado no quede en ninguna ruta, historial ni log. Solo se registra la vista del paso
// "seguridad", nunca su resultado (KTD14).

// Redacción provisional del prototipo, pendiente de cotejar con el PAR-Q+ 2023 (PRD §13).
const QUESTIONS: Record<ScreeningQuestion, string> = {
  cardiaco: "¿Te han diagnosticado un problema cardíaco o tensión alta?",
  dolor_toracico: "¿Sientes dolor en el pecho en reposo, en tu día a día o al hacer ejercicio?",
  mareos: "¿Has perdido el equilibrio por mareo o el conocimiento en los últimos 12 meses?",
  cronica: "¿Te han diagnosticado otra enfermedad crónica?",
  medicacion: "¿Tomas medicación prescrita para una enfermedad crónica?",
  articular: "¿Tienes un problema de huesos, articulaciones o tejidos blandos que empeore con la actividad?",
  supervision: "¿Te ha indicado un médico que solo hagas actividad física supervisada?",
  embarazo: "¿Estás embarazada?",
};

export function SeguridadStep() {
  useStepView("seguridad");
  const router = useRouter();
  const { limitations, screening, setScreening } = useWizard();
  const [view, setView] = useState<"preguntas" | "bloqueo">("preguntas");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<"zona" | "fallo" | null>(null);

  // Las limitaciones solo viven en memoria: si se ha recargado la página, se vuelven a marcar.
  useEffect(() => {
    if (limitations === null) router.replace("/limitaciones");
  }, [limitations, router]);

  const left = SCREENING_QUESTIONS.filter((q) => typeof screening[q] !== "boolean").length;
  const jointWithoutZone = screening.articular === true && (limitations ?? []).length === 0;

  async function submit() {
    if (limitations === null) return;
    setPending(true);
    setProblem(null);
    const result = await guardarSeguridad({ limitations, answers: screening });
    setPending(false);
    if (!result.ok) {
      if (result.error === "sin_sesion") router.push("/entrar");
      else if (result.error === "sin_consentimiento") router.push("/consentimiento");
      else setProblem("fallo");
      return;
    }
    if (result.status === "apto") router.push(result.hasPlan ? "/plan" : "/resumen");
    else if (result.status === "requiere_zona") setProblem("zona");
    else setView("bloqueo");
  }

  async function exit() {
    await salir();
    router.refresh();
    router.push("/");
  }

  if (view === "bloqueo") {
    return (
      <WizardScreen
        sober
        title="Primero, un profesional"
        subtitle="Esto no es un «no» para siempre."
        footer={
          <>
            <SecondaryButton onClick={() => setView("preguntas")}>Revisar mis respuestas</SecondaryButton>
            <TextButton onClick={exit}>Salir</TextButton>
          </>
        }
      >
        <div role="alert" className="flex flex-col gap-3">
          <p className="m-0 text-[17px]">Por alguna de tus respuestas, BUDDY no puede prepararte un plan para entrenar sin supervisión.</p>
          <p className="wz-help text-[15px]">
            Habla con tu médico o con un profesional sanitario antes de empezar. Te dirán qué tipo de ejercicio te conviene y con qué
            precauciones.
          </p>
        </div>
        <Note>Si te equivocaste al contestar, puedes revisar tus respuestas.</Note>
      </WizardScreen>
    );
  }

  return (
    <WizardScreen
      step={9}
      backHref="/limitaciones"
      title="Seguridad"
      subtitle="8 preguntas rápidas. Contesta con sinceridad: es por ti."
      footer={
        <>
          <p className="wz-help text-center" role="status">
            {left > 0 ? `Te quedan ${left} por responder` : "Todo respondido"}
          </p>
          <Cta disabled={left > 0 || jointWithoutZone || pending} onClick={submit}>
            Siguiente
          </Cta>
        </>
      }
    >
      {SCREENING_QUESTIONS.map((q) => (
        <div key={q} className="flex flex-col gap-2 rounded-md bg-card p-3">
          <p id={`q-${q}`} className="m-0 text-[15px]">
            {QUESTIONS[q]}
          </p>
          <Segmented
            label={QUESTIONS[q]}
            value={screening[q]}
            onChange={(value) => setScreening({ ...screening, [q]: value })}
            options={[
              { value: true, text: "Sí" },
              { value: false, text: "No" },
            ]}
          />
          {q === "articular" && jointWithoutZone ? (
            <Note tone="info" role="status">
              Marca la zona en Limitaciones y quitaremos los ejercicios que la cargan.{" "}
              <Link href="/limitaciones" className="font-bold text-secondary underline">
                Ir a limitaciones
              </Link>
            </Note>
          ) : null}
        </div>
      ))}
      <p className="wz-help">Redacción provisional, pendiente de cotejar con el PAR-Q+ 2023 oficial.</p>
      {problem === "zona" ? (
        <Note tone="warn" role="alert">
          Marca la zona que te molesta en Limitaciones.
        </Note>
      ) : null}
      {problem === "fallo" ? (
        <Note tone="danger" role="alert">
          No hemos podido guardar tus respuestas. Inténtalo de nuevo.
        </Note>
      ) : null}
    </WizardScreen>
  );
}
