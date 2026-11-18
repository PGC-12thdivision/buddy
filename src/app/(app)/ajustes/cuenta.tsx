"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { borrarCuenta } from "@/app/(wizard)/actions";
import { retirarConsentimiento } from "@/app/actions/account";
import { Sheet } from "@/components/session/sheet";
import { Note, SecondaryButton, TextButton } from "@/components/wizard/ui";

// Cuenta y privacidad (diseño D15, bloque 4): retirar el consentimiento y borrar la cuenta, cada uno
// con su hoja de confirmación accesible (DESIGN.md §8).
export function CuentaAcciones() {
  const router = useRouter();
  const [sheet, setSheet] = useState<null | "retirar" | "borrar">(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const close = useCallback(() => {
    if (pending) return;
    setSheet(null);
    setFailed(false);
  }, [pending]);

  async function withdraw() {
    setPending(true);
    setFailed(false);
    const result = await retirarConsentimiento();
    setPending(false);
    if (result.ok) {
      router.refresh();
      router.push(result.next);
      return;
    }
    if (result.error === "sin_sesion") router.push("/entrar");
    else setFailed(true);
  }

  async function remove() {
    setPending(true);
    setFailed(false);
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
    <>
      <div className="wz-rule-row">
        <TextButton onClick={() => setSheet("retirar")}>Retirar el consentimiento</TextButton>
      </div>
      <div className="wz-rule-row">
        <TextButton onClick={() => setSheet("borrar")}>Borrar la cuenta</TextButton>
      </div>

      {sheet === "retirar" ? (
        <Sheet title="¿Retirar el consentimiento?" onClose={close}>
          <p>Tu plan se pausa y borramos tus datos de salud. Podrás volver a darlo.</p>
          {failed ? (
            <Note tone="danger" role="alert">
              No hemos podido retirarlo. Inténtalo de nuevo.
            </Note>
          ) : null}
          <button type="button" className="wz-btn2 border-destructive text-destructive" disabled={pending} onClick={withdraw}>
            Sí, retirar el consentimiento
          </button>
          <SecondaryButton onClick={close} disabled={pending}>
            No, volver
          </SecondaryButton>
        </Sheet>
      ) : null}

      {sheet === "borrar" ? (
        <Sheet title="¿Borrar tu cuenta?" onClose={close}>
          <p>Se borran tu cuenta, tu plan, tu historial y tus datos de salud. No se puede deshacer.</p>
          {failed ? (
            <Note tone="danger" role="alert">
              No hemos podido borrarla. Inténtalo de nuevo.
            </Note>
          ) : null}
          <button type="button" className="wz-btn2 border-destructive text-destructive" disabled={pending} onClick={remove}>
            Sí, borrar mi cuenta
          </button>
          <SecondaryButton onClick={close} disabled={pending}>
            No, volver
          </SecondaryButton>
        </Sheet>
      ) : null}
    </>
  );
}
