"use client";

import { useEffect, useState } from "react";
import { reenviarConfirmacion } from "../actions";
import { Note, SecondaryButton, TextLink, WizardScreen } from "@/components/wizard/ui";
import { EMAIL_KEY } from "@/lib/wizard/draft";

const RESEND_WAIT_S = 60;

// "p…@…": solo la primera letra, para que se reconozca sin mostrar el email entero.
function maskEmail(email: string): string {
  return email.includes("@") ? `${email[0]}…@…` : "tu email";
}

// Revisa tu correo (sistema §11.12): vacío con marca de agua, Reenviar con 60 s de espera y
// Cambiar email.
export default function RevisaTuCorreo() {
  const [email, setEmail] = useState<string | null>(null);
  const [wait, setWait] = useState(RESEND_WAIT_S);
  const [message, setMessage] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de sessionStorage tras montar
    setEmail(window.sessionStorage.getItem(EMAIL_KEY));
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait(wait - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  async function resend() {
    if (!email) return;
    setWait(RESEND_WAIT_S);
    const result = await reenviarConfirmacion({ email });
    setMessage(
      result.ok
        ? { tone: "ok", text: "Te lo hemos vuelto a enviar." }
        : { tone: "danger", text: "Ahora mismo no podemos reenviarlo. Prueba dentro de un rato." },
    );
  }

  return (
    <WizardScreen step={6} stepLabel={false} title="Revisa tu correo">
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-2 py-6 text-center">
        <span className="wz-watermark" aria-hidden="true">
          @
        </span>
        <p className="relative m-0 text-[17px]">
          Te hemos enviado un enlace a <b>{email ? maskEmail(email) : "tu email"}</b>. Ábrelo para seguir.
        </p>
        <p className="wz-help relative mt-2">Puedes abrirlo en este móvil o en otro dispositivo: tus respuestas ya están guardadas.</p>
        <div className="relative mt-6 flex w-full flex-col gap-2">
          <SecondaryButton onClick={resend} disabled={!email || wait > 0}>
            {wait > 0 ? `Reenviar en ${wait} s` : "Reenviar"}
          </SecondaryButton>
          <TextLink href="/registro">Cambiar email</TextLink>
        </div>
        {message ? (
          <div className="relative mt-3 w-full text-left">
            <Note tone={message.tone} role={message.tone === "ok" ? "status" : "alert"}>
              {message.text}
            </Note>
          </div>
        ) : null}
      </div>
    </WizardScreen>
  );
}
