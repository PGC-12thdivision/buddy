"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { entrar, reenviarConfirmacion } from "../actions";
import { Cta, Field, Note, TextButton, TextLink, WizardScreen } from "@/components/wizard/ui";

const MESSAGES = {
  credenciales: "Email o contraseña incorrectos.",
  sin_confirmar: "Aún no has confirmado tu email. Busca nuestro enlace en tu correo.",
  limite: "Demasiados intentos seguidos. Prueba de nuevo dentro de un rato.",
  no_valido: "Escribe tu email y tu contraseña.",
} as const;

export function EntrarForm({ invalidLink }: { invalidLink: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<keyof typeof MESSAGES | null>(null);
  const [resent, setResent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await entrar({ email, password });
    if (result.ok) {
      router.refresh();
      router.push(result.next);
      return;
    }
    setPending(false);
    setError(result.error);
  }

  async function resend() {
    await reenviarConfirmacion({ email });
    setResent(true);
  }

  return (
    <form onSubmit={submit} noValidate className="contents">
      <WizardScreen
        backHref="/"
        title="Entrar"
        subtitle="Con el email y la contraseña de tu cuenta."
        footer={
          <>
            <Cta type="submit" disabled={pending}>
              Entrar
            </Cta>
            <TextLink href="/foco">Crear una cuenta</TextLink>
          </>
        }
      >
        {invalidLink ? (
          <Note tone="warn" role="alert">
            Ese enlace no vale o ha caducado. Entra con tu email y contraseña; si aún no habías confirmado, te lo reenviamos.
          </Note>
        ) : null}
        <Field id="email" label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field
          id="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? (
          <Note tone="danger" role="alert">
            {MESSAGES[error]}
            {error === "sin_confirmar" && !resent ? (
              <>
                {" "}
                <TextButton onClick={resend}>Reenviar el email</TextButton>
              </>
            ) : null}
          </Note>
        ) : null}
        {resent ? <Note role="status">Si la cuenta existe, te lo hemos vuelto a enviar.</Note> : null}
      </WizardScreen>
    </form>
  );
}
