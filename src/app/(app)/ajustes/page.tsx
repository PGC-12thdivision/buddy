import { AppScreen } from "@/components/app/screen";
import { requireAppContext } from "@/lib/app/context";
import { SalirButton } from "./salir";

// Ajustes (diseño D15): los 4 bloques llegan con U11. Por ahora, la cuenta.
export default async function AjustesPage() {
  const { premium, trialDaysLeft } = await requireAppContext();
  return (
    <AppScreen title="Ajustes">
      <section aria-labelledby="ajustes-cuenta">
        <h2 id="ajustes-cuenta" className="wz-rule-title">
          Cuenta
        </h2>
        <div className="wz-rule-row">
          <span>Suscripción</span>
          <span className="wz-rule-value font-bold">
            {premium && trialDaysLeft !== null ? `Prueba premium, ${trialDaysLeft} días` : premium ? "Premium" : "Gratis"}
          </span>
        </div>
        <SalirButton />
      </section>
    </AppScreen>
  );
}
