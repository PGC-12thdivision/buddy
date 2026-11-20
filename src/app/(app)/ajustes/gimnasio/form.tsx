"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { guardarGimnasio } from "@/app/actions/account";
import { EquipmentPicker } from "@/components/wizard/pickers";
import { Cta, Note, TextLink } from "@/components/wizard/ui";
import type { EquipmentOption } from "@/lib/catalog";
import type { GymPreset } from "@/lib/wizard/answers";
import type { PlanChange } from "@/lib/domain/exclusion-summary";
import { RefilterNote } from "../resultado";

export function GimnasioAjustes({
  equipment,
  initialPreset,
  initialSelected,
}: {
  equipment: EquipmentOption[];
  initialPreset: GymPreset | undefined;
  initialSelected: string[];
}) {
  const router = useRouter();
  const [preset, setPreset] = useState(initialPreset);
  const [selected, setSelected] = useState(initialSelected);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ changed: number; holes: number; changes: PlanChange[] } | "error" | null>(null);
  const complete = preset !== undefined && selected.length > 0;

  async function save() {
    if (!complete || pending) return;
    setPending(true);
    setResult(null);
    const res = await guardarGimnasio({ gymPreset: preset, equipmentTypeIds: selected });
    setPending(false);
    if (res.ok) {
      setResult({ changed: res.changed, holes: res.holes, changes: res.changes });
      router.refresh();
    } else if (res.error === "sin_sesion") router.push("/entrar");
    else setResult("error");
  }

  return (
    <>
      <EquipmentPicker
        equipment={equipment}
        preset={preset}
        selected={selected}
        onChange={(value) => {
          setPreset(value.gymPreset);
          setSelected(value.equipmentTypeIds);
          setResult(null);
        }}
      />
      {preset && selected.length === 0 ? (
        <Note tone="warn" role="status">
          Marca al menos un tipo de equipo para poder montarte el plan.
        </Note>
      ) : null}
      {result === "error" ? (
        <Note tone="danger" role="alert">
          No hemos podido guardar el cambio. Inténtalo de nuevo.
        </Note>
      ) : result ? (
        <RefilterNote changed={result.changed} holes={result.holes} changes={result.changes} />
      ) : null}
      <Cta disabled={!complete || pending} onClick={save}>
        {pending ? "Guardando…" : "Guardar"}
      </Cta>
      <TextLink href="/ajustes">Volver a Ajustes</TextLink>
    </>
  );
}
