"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppScreen, Tag } from "@/components/app/screen";
import { Cta, CtaLink, Note, Question, Segmented, TextLink } from "@/components/wizard/ui";

// Escalas del check-in y llamada a /api/checkin (plan.md U8; sistema §7 y §11.7, diseño D9 y D17).
// Solo dos escalas 1–5, sin texto libre (D29). Al salir bien, el servidor ya ha guardado el ajuste y
// la página lo muestra (router.refresh). Los errores van con cabecera sobria y role="alert".

type State = "escalas" | "cargando" | "conexion" | "validacion" | "limite" | "tope_diario";
type Scale = 1 | 2 | 3 | 4 | 5;

const SCALE: { value: Scale; text: string }[] = [1, 2, 3, 4, 5].map((n) => ({ value: n as Scale, text: String(n) }));

export function CheckinFlow() {
  const router = useRouter();
  const [state, setState] = useState<State>("escalas");
  const [sensacion, setSensacion] = useState<Scale>();
  const [fatiga, setFatiga] = useState<Scale>();
  const [step, setStep] = useState(0);
  const ready = sensacion !== undefined && fatiga !== undefined;

  async function send() {
    if (!ready) return;
    setState("cargando");
    setStep(0);
    let status = "conexion";
    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensacion, fatiga }),
      });
      status = ((await response.json()) as { status: string }).status;
    } catch {
      status = "conexion";
    }
    if (status === "sin_sesion") return router.replace("/entrar");
    if (status === "conexion" || status === "validacion" || status === "limite" || status === "tope_diario") return setState(status);
    // "ok" y los estados que decide la página (sin premium, no toca, vacío…): la página se vuelve a
    // pintar desde el servidor y muestra el que corresponda. Se mantiene la carga mientras tanto.
    router.refresh();
  }

  // Barra de 10 segmentos que avanza mientras responde el servidor; nunca llega al final sola.
  useEffect(() => {
    if (state !== "cargando") return;
    const timer = window.setInterval(() => setStep((s) => Math.min(s + 1, 8)), 2500);
    return () => window.clearInterval(timer);
  }, [state]);

  if (state === "conexion") {
    return (
      <AppScreen sober kicker="Check-in" title="Sin conexión" footer={<Cta onClick={send}>Reintentar</Cta>}>
        <p role="alert" className="m-0 text-[17px]">
          El coach no responde. Tu plan sigue igual; este intento no cuenta.
        </p>
      </AppScreen>
    );
  }

  if (state === "validacion") {
    return (
      <AppScreen
        sober
        kicker="Check-in"
        title="No ha salido bien"
        footer={
          <>
            <Cta onClick={send}>Reintentar</Cta>
            <TextLink href="/hoy">Mantener mi plan</TextLink>
          </>
        }
      >
        <p role="alert" className="m-0 text-[17px]">
          No hemos podido montar un ajuste seguro con estas opciones. No hemos guardado nada y este intento no cuenta.
        </p>
      </AppScreen>
    );
  }

  if (state === "limite" || state === "tope_diario") {
    return (
      <AppScreen sober kicker="Check-in" title="Por ahora, no más" footer={<CtaLink href="/hoy">Volver a Hoy</CtaLink>}>
        <p role="alert" className="m-0 text-[17px]">
          {state === "limite"
            ? "Ya has usado el check-in de esta semana. El próximo, la semana que viene."
            : "Hoy ya has hecho muchos intentos. Tu plan sigue igual: vuelve a probar mañana."}
        </p>
      </AppScreen>
    );
  }

  if (state === "cargando") {
    return (
      <AppScreen kicker="Analizando" title="Leyendo tu semana" subtitle="Entre 10 y 30 segundos. No cierres esta pantalla.">
        <div className="mt-2 grid h-7 grid-cols-10 gap-[3px] rounded-[4px] border-[3px] border-foreground p-[3px] dark:border-primary" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} className={i <= step ? "bg-primary" : "bg-card"} />
          ))}
        </div>
        <p className="m-0 text-center font-pixel text-[12px] uppercase motion-safe:animate-pulse" role="status">
          Pensando…
        </p>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      kicker="Check-in"
      title="Cierra tu semana"
      subtitle="Dos preguntas y tu coach ajusta la semana que viene."
      tags={<Tag premium>Premium</Tag>}
      footer={
        <Cta onClick={send} disabled={!ready}>
          Ver mi ajuste
        </Cta>
      }
    >
      <section className="flex flex-col gap-2" aria-labelledby="checkin-sensacion">
        <Question>
          <span id="checkin-sensacion">¿Cómo te has sentido esta semana?</span>
        </Question>
        <Segmented label="Cómo te has sentido, de 1 (muy mal) a 5 (muy bien)" options={SCALE} value={sensacion} onChange={setSensacion} />
        <p className="wz-help m-0 flex justify-between" aria-hidden="true">
          <span>1 muy mal</span>
          <span>5 muy bien</span>
        </p>
      </section>
      <section className="flex flex-col gap-2" aria-labelledby="checkin-fatiga">
        <Question>
          <span id="checkin-fatiga">¿Cuánta fatiga arrastras?</span>
        </Question>
        <Segmented label="Fatiga, de 1 (nada) a 5 (mucha)" options={SCALE} value={fatiga} onChange={setFatiga} />
        <p className="wz-help m-0 flex justify-between" aria-hidden="true">
          <span>1 nada</span>
          <span>5 mucha</span>
        </p>
      </section>
      <Note>Al coach solo le llegan estas dos escalas y tu plan. Tus molestias y limitaciones no salen de BUDDY: las aplican las reglas después.</Note>
    </AppScreen>
  );
}
