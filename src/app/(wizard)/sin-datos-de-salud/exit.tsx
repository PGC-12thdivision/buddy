"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { borrarCuenta } from "../actions";
import { CtaLink, Note, SecondaryButton, TextButton, WizardScreen } from "@/components/wizard/ui";

// Salida sin consentimiento (diseño D14): cabecera sobria, "Volver y aceptar" o "Borrar mi
// cuenta" con hoja de confirmación. <dialog> modal: foco atrapado, Esc cierra y el foco vuelve
// al botón que la abrió (DESIGN.md §8).
export function SinDatosDeSalud() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirmDelete() {
    setPending(true);
    const result = await borrarCuenta();
    if (result.ok) {
      window.localStorage.clear();
      router.refresh();
      router.push("/");
      return;
    }
    setPending(false);
    setFailed(true);
  }

  return (
    <WizardScreen
      sober
      title="Sin datos de salud"
      footer={
        <>
          <CtaLink href="/consentimiento">Volver y aceptar</CtaLink>
          <TextButton onClick={() => dialog.current?.showModal()}>Borrar mi cuenta</TextButton>
        </>
      }
    >
      <p className="m-0 text-[17px]">Sin estos datos no podemos crear un plan que respete tus limitaciones.</p>
      <p className="wz-help text-[15px]">No hemos guardado nada de salud.</p>

      <dialog
        ref={dialog}
        aria-labelledby="borrar-titulo"
        className="m-0 mt-auto w-full max-w-[480px] border-t-[3px] border-foreground bg-background p-[18px] text-foreground backdrop:bg-[rgb(18_10_28/0.55)] sm:mx-auto"
      >
        <div className="flex flex-col gap-3">
          <h2 id="borrar-titulo" className="m-0 text-xl font-extrabold">
            ¿Borrar tu cuenta?
          </h2>
          <p className="m-0 text-[15px] text-muted-foreground">Se borran tu cuenta y tus respuestas. No se puede deshacer.</p>
          {failed ? (
            <Note tone="danger" role="alert">
              No hemos podido borrarla. Inténtalo de nuevo.
            </Note>
          ) : null}
          <button type="button" className="wz-btn2 border-destructive text-destructive" disabled={pending} onClick={confirmDelete}>
            Sí, borrar mi cuenta
          </button>
          <SecondaryButton onClick={() => dialog.current?.close()}>No, volver</SecondaryButton>
        </div>
      </dialog>
    </WizardScreen>
  );
}
