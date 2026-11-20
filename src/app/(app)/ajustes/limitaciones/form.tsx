"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { guardarLimitaciones } from "@/app/actions/account";
import { ZonePicker } from "@/components/wizard/pickers";
import { Cta, Note, TextLink } from "@/components/wizard/ui";
import type { Joint } from "@/lib/domain/types";
import type { PlanChange } from "@/lib/domain/exclusion-summary";
import { RefilterNote } from "../resultado";

export function LimitacionesAjustes({ initial }: { initial: Joint[] }) {
  const router = useRouter();
  const [zones, setZones] = useState<Joint[]>(initial);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ changed: number; holes: number; changes: PlanChange[] } | "error" | "sin_refiltrar" | null>(null);

  async function save() {
    if (pending) return;
    setPending(true);
    setResult(null);
    const res = await guardarLimitaciones({ limitations: zones });
    setPending(false);
    if (res.ok) {
      setResult({ changed: res.changed, holes: res.holes, changes: res.changes });
      router.refresh();
    } else if (res.error === "sin_sesion") router.push("/entrar");
    else if (res.error === "sin_consentimiento") router.push("/consentimiento");
    else if (res.error === "plan_sin_actualizar") setResult("sin_refiltrar");
    else setResult("error");
  }

  return (
    <>
      <p className="m-0 text-[15px]">¿Alguna zona te molesta o tienes una lesión?</p>
      <ZonePicker
        value={zones}
        onChange={(value) => {
          setZones(value);
          setResult(null);
        }}
      />
      {result === "sin_refiltrar" ? (
        <Note tone="warn" role="alert">
          Hemos guardado tus limitaciones, pero no hemos podido ajustar tu plan. Pulsa Guardar otra vez en un momento.
        </Note>
      ) : result === "error" ? (
        <Note tone="danger" role="alert">
          No hemos podido guardar el cambio. Inténtalo de nuevo.
        </Note>
      ) : result ? (
        <RefilterNote changed={result.changed} holes={result.holes} changes={result.changes} />
      ) : null}
      <Cta disabled={pending} onClick={save}>
        {pending ? "Guardando…" : "Guardar"}
      </Cta>
      <TextLink href="/ajustes">Volver a Ajustes</TextLink>
    </>
  );
}
