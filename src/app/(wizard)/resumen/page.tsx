import type { Route } from "next";
import Link from "next/link";
import { CtaLink, Note, WizardScreen } from "@/components/wizard/ui";
import { StepView } from "@/components/wizard/wizard-provider";
import type { Joint } from "@/lib/domain/types";
import { EXPERIENCE_LABELS, FOCUS_LABELS, GYM_PRESET_LABELS, type WizardAnswers } from "@/lib/wizard/answers";
import { requireWizardAccount } from "@/lib/wizard/guard";
import { JOINT_LABELS } from "@/lib/wizard/zones";
import { SeedDraft } from "./seed-draft";

// Pantalla 10, "TODO LISTO" (sistema §11.12): una fila por respuesta con "Cambiar". El cribado
// no se muestra, solo "Seguridad: respondida".
export default async function Resumen() {
  const { supabase, userId } = await requireWizardAccount("cribado");
  const [answers, gym, health, activities] = await Promise.all([
    supabase.from("onboarding_answers").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("gym_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("health_profile").select("limitations").eq("user_id", userId).maybeSingle(),
    supabase.from("activity_types").select("id, name"),
  ]);
  const a = answers.data;
  const g = gym.data;
  const sportNames = (a?.sports ?? []).map((id) => activities.data?.find((x) => x.id === id)?.name ?? id);
  const limitations = (health.data?.limitations ?? []) as Joint[];

  const rows: { label: string; value: string | null; href: Route }[] = [
    { label: "Foco", value: a ? FOCUS_LABELS[a.focus as WizardAnswers["focus"]] : null, href: "/foco?volver=resumen" },
    { label: "Experiencia", value: a ? EXPERIENCE_LABELS[a.experience as WizardAnswers["experience"]] : null, href: "/experiencia?volver=resumen" },
    {
      label: "Semana",
      value: a ? `${a.days_per_week} días, ${a.minutes_per_session === 75 ? "75 o más" : a.minutes_per_session} minutos` : null,
      href: "/semana?volver=resumen",
    },
    { label: "Deportes", value: a ? (sportNames.length ? sportNames.join(", ") : "Ninguno") : null, href: "/deportes?volver=resumen" },
    {
      label: "Gimnasio",
      value: g ? `${GYM_PRESET_LABELS[g.preset as keyof typeof GYM_PRESET_LABELS]}, ${g.equipment_type_ids.length} tipos de equipo` : null,
      href: "/gimnasio?volver=resumen",
    },
    { label: "Limitaciones", value: limitations.length ? limitations.map((j) => JOINT_LABELS[j]).join(", ") : "Ninguna", href: "/limitaciones" },
  ];
  const missing = rows.some((r) => r.value === null);

  const seed: Partial<WizardAnswers> = {};
  if (a) {
    Object.assign(seed, {
      focus: a.focus,
      experience: a.experience,
      daysPerWeek: a.days_per_week,
      minutesPerSession: a.minutes_per_session,
      sports: a.sports,
    });
  }
  if (g) Object.assign(seed, { gymPreset: g.preset, equipmentTypeIds: g.equipment_type_ids });

  return (
    <>
      <StepView step="resumen" />
      <SeedDraft answers={seed} />
      <WizardScreen
        step={10}
        title="Todo listo"
        subtitle="Revisa y cambia lo que quieras antes de generar tu plan."
        footer={missing ? null : <CtaLink href="/generando">Generar mi plan</CtaLink>}
      >
        <h2 className="wz-rule-title">Tus respuestas</h2>
        <dl className="m-0">
          {rows.map((row) => (
            <div key={row.label} className="wz-rule-row">
              <div>
                <dt className="text-[13px] text-muted-foreground">{row.label}</dt>
                <dd className="m-0 text-base font-bold">{row.value ?? "Sin responder"}</dd>
              </div>
              <Link href={row.href} className="wz-link" aria-label={`${row.value === null ? "Responder" : "Cambiar"} ${row.label.toLowerCase()}`}>
                {row.value === null ? "Responder" : "Cambiar"}
              </Link>
            </div>
          ))}
          <div className="wz-rule-row">
            <div>
              <dt className="text-[13px] text-muted-foreground">Seguridad</dt>
              <dd className="m-0 text-base font-bold">Respondida</dd>
            </div>
          </div>
        </dl>
        {missing ? (
          <Note tone="warn" role="status">
            Falta alguna respuesta. Complétala para poder generar tu plan.
          </Note>
        ) : null}
      </WizardScreen>
    </>
  );
}
