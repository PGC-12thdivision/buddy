"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Cta, CtaLink, TextLink, WizardScreen } from "@/components/wizard/ui";
import { useStepView } from "@/components/wizard/wizard-provider";

// Pantalla 11, generando el plan (sistema §7 y §11.7, diseño D9). Llama a /api/plan una vez y,
// si sale bien, lleva a la pestaña Plan (U6). Errores con cabecera sobria y role="alert".

type State = "cargando" | "conexion" | "validacion" | "limite";

const STEPS = [
  "Filtrando tu equipo",
  "Eligiendo ejercicios del catálogo",
  "Comprobando el volumen de cada grupo",
  "Montando tu semana",
];

export function Generando() {
  useStepView("plan");
  const router = useRouter();
  const [state, setState] = useState<State>("cargando");
  const [step, setStep] = useState(0);
  const started = useRef(false);

  const generate = useCallback(async () => {
    setState("cargando");
    setStep(0);
    let status = "conexion";
    try {
      const response = await fetch("/api/plan", { method: "POST" });
      status = ((await response.json()) as { status: string }).status;
    } catch {
      status = "conexion";
    }
    if (status === "ok") {
      setStep(STEPS.length);
      router.replace("/plan");
      return;
    }
    if (status === "sin_sesion") return router.replace("/entrar");
    if (status === "sin_permiso" || status === "incompleto") return router.replace("/resumen");
    setState(status === "limite" ? "limite" : status === "validacion" ? "validacion" : "conexion");
  }, [router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void generate();
  }, [generate]);

  // Avance de los pasos mientras responde el servidor; el último solo se completa con el plan.
  useEffect(() => {
    if (state !== "cargando") return;
    const timer = window.setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 4000);
    return () => window.clearInterval(timer);
  }, [state]);

  if (state === "conexion") {
    return (
      <WizardScreen sober title="Sin conexión" footer={<Cta onClick={generate}>Reintentar</Cta>}>
        <p role="alert" className="m-0 text-[17px]">
          Tus respuestas están guardadas.
        </p>
      </WizardScreen>
    );
  }

  if (state === "validacion") {
    return (
      <WizardScreen
        sober
        title="No ha salido bien"
        footer={
          <>
            <Cta onClick={generate}>Reintentar</Cta>
            <TextLink href="/resumen">Revisar mis respuestas</TextLink>
          </>
        }
      >
        <p role="alert" className="m-0 text-[17px]">
          No hemos podido montar un plan seguro con estas opciones. No hemos guardado nada y este intento no cuenta.
        </p>
      </WizardScreen>
    );
  }

  if (state === "limite") {
    return (
      <WizardScreen sober title="Por ahora, no más" footer={<CtaLink href="/plan">Ver mi plan</CtaLink>}>
        <p role="alert" className="m-0 text-[17px]">
          Ya tienes tu plan. Puedes cambiar el foco o los días una vez al mes; con premium, hasta 5 veces al mes.
        </p>
      </WizardScreen>
    );
  }

  return (
    <WizardScreen step={11} title="Creando tu plan" subtitle="Entre 10 y 30 segundos. No cierres esta pantalla.">
      <div className="mt-4 grid h-7 grid-cols-10 gap-[3px] rounded-[4px] border-[3px] border-foreground p-[3px] dark:border-primary" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} className={i < Math.round(((step + 1) / STEPS.length) * 10) ? "bg-primary" : "bg-card"} />
        ))}
      </div>
      <p className="m-0 text-center font-pixel text-[12px] uppercase motion-safe:animate-pulse" role="status">
        Generando tu plan
      </p>
      <ol className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
        {STEPS.map((label, i) => (
          <li key={label} className={i < step ? "text-foreground" : i === step ? "font-bold" : "text-muted-foreground"}>
            <span aria-hidden="true">{i < step ? "✓ " : i === step ? "→ " : ""}</span>
            {label}
          </li>
        ))}
      </ol>
    </WizardScreen>
  );
}
