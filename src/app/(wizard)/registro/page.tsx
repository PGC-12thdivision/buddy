"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { registrarse, type RegistroResult } from "../actions";
import { Cta, Field, Note, TextLink, WizardScreen } from "@/components/wizard/ui";
import { useStepView, useWizard } from "@/components/wizard/wizard-provider";
import { answersSchema } from "@/lib/wizard/answers";
import { EMAIL_KEY } from "@/lib/wizard/draft";


// Registro (sistema §11.12, "TU CUENTA"): email, contraseña con botón de mostrar y casilla +18
// sin marcar. Las respuestas previas viajan con el registro y se guardan en la cuenta (KTD4).
export default function Registro() {
  useStepView("registro");
  const router = useRouter();
  const { draft, ready, clearEvents } = useWizard();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adult, setAdult] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Extract<RegistroResult, { ok: false }>["errors"]>({});

  const answers = answersSchema.safeParse(draft.answers);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!answers.success) return;
    setPending(true);
    setErrors({});
    const result = await registrarse({ email, password, adult, answers: answers.data, events: draft.events });
    setPending(false);
    if (!result.ok) {
      setErrors(result.errors);
      const first = (["email", "password", "adult"] as const).find((field) => result.errors[field]);
      // Tras pintar los errores, el foco va al primer campo que falla.
      window.setTimeout(() => (first ? document.getElementById(first === "adult" ? "adult" : first)?.focus() : undefined), 0);
      return;
    }
    clearEvents();
    if (result.next) {
      // Sesión abierta al registrarse (sin confirmación de email): se sigue sin pasar por el correo.
      router.push(result.next);
      return;
    }
    window.sessionStorage.setItem(EMAIL_KEY, email);
    router.push("/revisa-tu-correo");
  }

  return (
    <form onSubmit={submit} noValidate className="contents">
      <WizardScreen
        step={6}
        stepLabel={false}
        backHref="/gimnasio"
        title="Tu cuenta"
        subtitle="Para guardar tu plan y tu progreso."
        footer={
          <>
            <Cta type="submit" disabled={pending || !answers.success}>
              Crear mi cuenta
            </Cta>
            <TextLink href="/entrar">Ya tengo cuenta</TextLink>
          </>
        }
      >
        {ready && !answers.success ? (
          <Note tone="warn" role="status">
            Te faltan respuestas del principio. <Link href="/foco" className="font-bold underline">Volver a empezar</Link>
          </Note>
        ) : null}
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <Field
          id="password"
          label="Contraseña"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
          hint={
            <div className="flex items-center justify-between">
              <p className="wz-help">Al menos 8 caracteres.</p>
              <button
                type="button"
                className="wz-link"
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              </button>
            </div>
          }
        />
        <div className="flex flex-col gap-1.5">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] font-bold">
            <input
              id="adult"
              type="checkbox"
              className="wz-check"
              checked={adult}
              onChange={(e) => setAdult(e.target.checked)}
              aria-invalid={errors.adult ? true : undefined}
              aria-describedby={errors.adult ? "adult-error" : undefined}
            />
            Tengo 18 años o más
          </label>
          {errors.adult ? (
            <p id="adult-error" className="wz-error">
              {errors.adult}
            </p>
          ) : null}
        </div>
        <p className="wz-help">Tus respuestas se guardan en tu cuenta. Aún no te pedimos nada de salud.</p>
        {errors.form ? (
          <Note tone="danger" role="alert">
            {errors.form}
          </Note>
        ) : null}
      </WizardScreen>
    </form>
  );
}
