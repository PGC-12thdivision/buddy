import { AppScreen, Disclaimer, Tag } from "@/components/app/screen";
import { Cta, Note, TextButton, TextLink } from "@/components/wizard/ui";
import { requireAppContext } from "@/lib/app/context";
import { safeReturnPath } from "@/lib/domain/subscription";
import { premiumPriceLabel } from "@/lib/stripe";

// "¿CONTINUAR?" (sistema de diseño §7 y D10/D30; plan.md U9): fin de la prueba y destino del candado
// del check-in. Qué sigue gratis, qué da premium y el CTA a Checkout; para quien ya paga, su estado y
// "Gestionar". Solo se anuncia lo que ya existe en la app.

const FREE = [
  "Tu plan y el refiltrado si cambias de equipo o de limitaciones",
  "El registro de tus sesiones y tu historial",
  "La sugerencia de peso en cada serie",
  "La gráfica de peso de trabajo de las últimas 8 semanas",
  "Un cambio de foco o de días al mes",
];
const PREMIUM = ["El coach semanal: revisa tu semana y ajusta la siguiente", "Cambiar el foco o los días cuando quieras"];

const ERRORS: Record<string, string> = {
  pago: "No hemos podido abrir el pago. No se ha hecho ningún cargo. Inténtalo de nuevo.",
  gestion: "No hemos podido abrir la gestión de tu suscripción. Inténtalo de nuevo.",
};

function List({ id, title, items }: { id: string; title: string; items: string[] }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="wz-rule-title">
        {title}
      </h2>
      <ul className="m-0 list-none p-0">
        {items.map((item) => (
          <li key={item} className="wz-rule-row">
            <span>{item}</span>
            <span aria-hidden="true" className="wz-rule-value font-bold">
              ✓
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function PremiumPage({ searchParams }: PageProps<"/premium">) {
  const [{ premium, paying, hasStripeCustomer, trialDaysLeft }, params, price] = await Promise.all([
    requireAppContext(),
    searchParams,
    premiumPriceLabel(),
  ]);
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  const volver = safeReturnPath(params.desde);

  if (paying) {
    return (
      <AppScreen title="Premium activo" tags={<Tag premium>Premium</Tag>}>
        {error ? (
          <Note tone="danger" role="alert">
            {error}
          </Note>
        ) : null}
        <List id="premium-incluye" title="Tienes" items={PREMIUM} />
        {hasStripeCustomer ? (
          <form action="/api/stripe/portal" method="post" className="wz-rule-row">
            <span>Pagos, factura o cancelar</span>
            <TextButton type="submit">Gestionar</TextButton>
          </form>
        ) : null}
        <Disclaimer />
      </AppScreen>
    );
  }

  const subtitle =
    premium && trialDaysLeft !== null
      ? `Te ${trialDaysLeft === 1 ? "queda 1 día" : `quedan ${trialDaysLeft} días`} de prueba premium.`
      : "Tu prueba premium ha terminado. Tu plan sigue contigo.";

  return (
    <AppScreen
      title="¿Continuar?"
      subtitle={subtitle}
      footer={
        <form action="/api/stripe/checkout" method="post" className="flex flex-col gap-2.5">
          <input type="hidden" name="volver" value={volver} />
          <Cta type="submit">Hazte premium</Cta>
          <TextLink href={volver === "/premium" ? "/hoy" : volver}>Ahora no</TextLink>
        </form>
      }
    >
      {error ? (
        <Note tone="danger" role="alert">
          {error}
        </Note>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
        <List id="premium-gratis" title="Sigue gratis" items={FREE} />
        <List id="premium-con" title="Con premium" items={PREMIUM} />
      </div>
      <p className="m-0 text-[15px]">
        {price ? `${price}. ` : ""}Cancela cuando quieras desde Ajustes.
      </p>
      <Note>Pago en modo de prueba: no se cobra dinero real.</Note>
      <Disclaimer />
    </AppScreen>
  );
}
