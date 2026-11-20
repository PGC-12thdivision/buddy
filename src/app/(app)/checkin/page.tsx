import type { Route } from "next";
import { AppScreen, Disclaimer, Tag, WeekStrip } from "@/components/app/screen";
import { StartButton } from "@/components/session/start-button";
import { CtaLink, Note } from "@/components/wizard/ui";
import { discomfortForDisplay, loadCheckinState } from "@/lib/app/checkin-core";
import { requireAppContext } from "@/lib/app/context";
import { CheckinFlow } from "./flow";
import { CheckinResult, type ChangeView } from "./result";

// Check-in de la semana (plan.md U8; PRD §11, función 1; diseño D9, D10, D17; sistema §7). El
// servidor decide qué estado se ve: bloqueado sin premium, "no toca", vacío ("Aún no hay partida"),
// las escalas o el ajuste ya guardado (que nunca vuelve a llamar a la IA).

export default async function CheckinPage() {
  const { supabase, userId, plan, premium } = await requireAppContext();
  const state = await loadCheckinState(supabase, userId, plan.daysPerWeek, premium);

  if (state.row) {
    const adjustment = state.row.adjustment;
    if (!adjustment) {
      return (
        <AppScreen sober kicker="Tu ajuste" title="No ha salido bien" footer={<CtaLink href="/hoy">Volver a Hoy</CtaLink>}>
          <p role="alert" className="m-0 text-[17px]">
            No hemos podido leer el ajuste de esta semana. Tu plan sigue igual.
          </p>
        </AppScreen>
      );
    }
    const [{ data: exercises }, discomfort] = await Promise.all([supabase.from("exercises").select("id, name"), discomfortForDisplay(supabase, userId)]);
    const names = new Map((exercises ?? []).map((e) => [e.id, e.name]));
    const name = (id: string | null) => (id ? (names.get(id) ?? id) : "Hueco vacío");
    const changes: ChangeView[] = adjustment.cambios.map((c) => ({
      key: `${c.sesion}-${c.posicion}`,
      day: `Día ${c.sesion + 1}`,
      name: name(c.despues),
      before: c.antes !== c.despues ? name(c.antes) : null,
      sets: c.despues ? `${c.seriesDespues} series` : "",
      setsBefore: c.despues && c.seriesAntes !== c.seriesDespues ? `antes ${c.seriesAntes}` : null,
      why:
        c.origen === "coach"
          ? (c.motivo ?? "Propuesta de tu coach.")
          : c.antes && c.antes !== c.despues && discomfort.has(c.antes)
            ? "Lo marcaste con molestia esta semana: lo cambiamos por seguridad."
            : "Ajuste de las reglas: tus limitaciones, tu equipo o los topes de volumen.",
      byRules: c.origen === "reglas",
    }));
    const rules = changes.filter((c) => c.byRules).length;
    const rulesLines = [
      ...(rules > 0 ? [`Las reglas han cambiado ${rules} ${rules === 1 ? "hueco" : "huecos"} por seguridad (marcados abajo).`] : []),
      ...(adjustment.descartados > 0
        ? [`Han descartado ${adjustment.descartados} ${adjustment.descartados === 1 ? "cambio propuesto" : "cambios propuestos"} que no encajaban con tus limitaciones o tus molestias.`]
        : []),
      "Ningún grupo pasa de 20 series a la semana y cada ejercicio lleva al menos 2.",
      "Los pesos no los toca el coach: los siguen calculando las reglas de progresión en cada sesión.",
    ];
    return (
      <CheckinResult
        title={adjustment.titulo}
        explanation={adjustment.explicacion}
        changes={changes}
        rules={rulesLines}
        applied={state.row.applied}
        premium={premium}
      />
    );
  }

  if (!premium) {
    // Sin premium no se llama a la IA (D10). El destino "¿CONTINUAR?" llega con Stripe (U9); hasta
    // entonces, la suscripción de Ajustes.
    return (
      <AppScreen kicker="Check-in" title="Tu coach es premium" tags={<Tag premium>Premium</Tag>} footer={<CtaLink href={"/premium?desde=/checkin" as Route}>Ver qué incluye premium</CtaLink>}>
        <p className="m-0 text-[17px]">
          Cada semana, el coach lee cómo te has sentido y ajusta series y ejercicios de tu plan, dentro de los topes de seguridad, explicándote el porqué.
        </p>
        <Note>Tu plan, el registro de sesiones y la sugerencia de peso siguen gratis.</Note>
        <Disclaimer />
      </AppScreen>
    );
  }

  if (state.window === "vacio") {
    return (
      <AppScreen kicker="Check-in" title="Cierra tu semana">
        <div className="relative flex flex-1 flex-col items-center justify-center gap-5 overflow-hidden py-8 text-center">
          <span className="wz-watermark" aria-hidden="true">
            B
          </span>
          <h2 className="relative m-0 font-display text-2xl font-black uppercase italic [font-stretch:125%]">Aún no hay partida</h2>
          <div className="relative w-full max-w-xs">
            <WeekStrip days={plan.daysPerWeek} done={0} />
          </div>
          <p className="wz-help relative m-0 text-[15px]">Esta semana no hay sesiones. Entrena y el domingo que viene tu coach tendrá algo que leer.</p>
          <div className="relative flex w-full max-w-sm flex-col gap-2.5">
            <StartButton>Empezar sesión</StartButton>
          </div>
        </div>
      </AppScreen>
    );
  }

  if (state.window === "no_toca") {
    return (
      <AppScreen kicker="Check-in" title="Aún no toca" footer={<CtaLink href="/hoy">Volver a Hoy</CtaLink>}>
        <p className="m-0 text-[17px]">Tu check-in se abre al terminar tu última sesión de la semana, o el domingo si te quedan sesiones.</p>
      </AppScreen>
    );
  }

  return <CheckinFlow />;
}
