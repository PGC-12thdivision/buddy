"use client";

import { useState, useTransition } from "react";
import { empezarSesion } from "@/app/actions/session";

// "Empezar sesión" (diseño D29): mientras se prepara, barra por segmentos y "Preparando tu sesión";
// si falla, aviso de conexión y el mismo botón para reintentar. Nunca empieza con pesos sin confirmar.
export function StartButton({ children }: { children: string }) {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  const go = () =>
    start(async () => {
      setFailed(false);
      const res = await empezarSesion();
      if (res && !res.ok) setFailed(true);
    });

  return (
    <>
      {failed ? (
        <p role="alert" className="wz-error m-0">
          Sin conexión. Necesitamos conexión para cargar y guardar tu sesión.
        </p>
      ) : null}
      <button type="button" className="wz-cta" onClick={go} disabled={pending} aria-busy={pending}>
        {pending ? (
          <span className="flex flex-col items-center gap-1.5" role="status">
            <span className="text-[15px]">Preparando tu sesión</span>
            <span className="ss-xp w-40" style={{ gridTemplateColumns: "repeat(10, 1fr)", borderColor: "var(--foreground)" }} aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <i key={i} data-on="" style={{ background: "var(--foreground)", opacity: 0.25 + i * 0.07 }} />
              ))}
            </span>
          </span>
        ) : failed ? (
          "Reintentar"
        ) : (
          children
        )}
      </button>
    </>
  );
}
