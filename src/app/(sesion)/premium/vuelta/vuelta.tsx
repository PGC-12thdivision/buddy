"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Cta, CtaLink, WizardScreen } from "@/components/wizard/ui";
import type { ReturnPath } from "@/lib/domain/subscription";

// Los 4 estados de la vuelta de Stripe (diseño D11). Mientras espera, consulta /api/stripe/estado,
// que lee account_status: premium solo se activa cuando lo ha escrito el webhook.

type State = "esperando" | "hecho" | "fallido" | "agotado";

const POLL_MS = 2000;
const MAX_WAIT_MS = 30_000;
const SEGMENTS = 10;

export function Vuelta({ cancelled, volver }: { cancelled: boolean; volver: ReturnPath }) {
  const router = useRouter();
  const [state, setState] = useState<State>("esperando");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (cancelled) return;
    const start = Date.now();
    let timer: number | undefined;
    let stopped = false;

    async function poll() {
      let next = "esperando";
      try {
        const response = await fetch("/api/stripe/estado", { cache: "no-store" });
        if (response.status === 401) {
          router.replace("/entrar");
          return;
        }
        next = ((await response.json()) as { state: string }).state;
      } catch {
        next = "esperando";
      }
      if (stopped) return;
      const waited = Date.now() - start;
      setElapsed(waited);
      if (next === "hecho" || next === "fallido") return setState(next);
      if (waited >= MAX_WAIT_MS) return setState("agotado");
      timer = window.setTimeout(poll, POLL_MS);
    }

    void poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [cancelled, router]);

  // Hecho: el pop se ve un momento y se vuelve a donde estaba, con el estado premium ya leído.
  useEffect(() => {
    if (state !== "hecho") return;
    const t = window.setTimeout(() => {
      router.refresh();
      router.replace(volver);
    }, 1400);
    return () => window.clearTimeout(t);
  }, [state, volver, router]);

  if (cancelled) {
    return (
      <WizardScreen title="Pago cancelado" footer={<CtaLink href={volver}>Volver</CtaLink>}>
        <p role="status" className="m-0 text-[17px]">
          No se ha hecho ningún cargo.
        </p>
      </WizardScreen>
    );
  }

  if (state === "fallido") {
    return (
      <WizardScreen
        sober
        title="Pago sin confirmar"
        footer={
          <form action="/api/stripe/checkout" method="post" className="flex flex-col gap-2.5">
            <input type="hidden" name="volver" value={volver} />
            <Cta type="submit">Reintentar</Cta>
          </form>
        }
      >
        <p role="alert" className="m-0 text-[17px]">
          No hemos podido confirmar el pago.
        </p>
      </WizardScreen>
    );
  }

  // Sin "Reintentar": el primer cargo aún puede estar confirmándose (diseño D11).
  if (state === "agotado") {
    return (
      <WizardScreen sober title="Pago sin confirmar" footer={<CtaLink href="/hoy">Volver a Hoy</CtaLink>}>
        <p role="alert" className="m-0 text-[17px]">
          No hemos podido confirmar el pago. Si ves el cargo en tu banco, no vuelvas a pagar: premium se activará en unos
          minutos.
        </p>
      </WizardScreen>
    );
  }

  if (state === "hecho") {
    return (
      <WizardScreen title="Premium activado">
        <div className="ss-pop" data-long="" aria-hidden="true">
          <b>Premium activado</b>
          Sigue jugando
        </div>
        <p role="status" className="m-0 text-[17px]">
          Ya tienes premium. Te llevamos de vuelta.
        </p>
      </WizardScreen>
    );
  }

  const filled = Math.min(SEGMENTS, Math.max(1, Math.ceil((elapsed / MAX_WAIT_MS) * SEGMENTS)));
  return (
    <WizardScreen title="Activando premium" subtitle="Puede tardar unos segundos. No cierres esta pantalla.">
      <div
        className="mt-4 grid h-7 grid-cols-10 gap-[3px] rounded-[4px] border-[3px] border-foreground p-[3px] dark:border-primary"
        aria-hidden="true"
      >
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <i key={i} className={i < filled ? "bg-primary" : "bg-card"} />
        ))}
      </div>
      <p className="m-0 text-center font-pixel text-[12px] uppercase motion-safe:animate-pulse" role="status">
        Activando premium…
      </p>
    </WizardScreen>
  );
}
