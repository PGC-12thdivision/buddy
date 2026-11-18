import { AppScreen } from "@/components/app/screen";
import { requireAppContext } from "@/lib/app/context";
import { SalirButton } from "./salir";

// Ajustes (diseño D15; dirección B, D59: marcador "interior", sin cifra). Los 4 bloques con reglas
// de imprenta; lo que llega con U11 se anuncia en vez de dejar un hueco (auditoría 18/11, P2.6).
// En escritorio, 2 columnas (D24).

function Soon({ label }: { label: string }) {
  return (
    <div className="wz-rule-row">
      <span>{label}</span>
      <span className="wz-rule-value text-[14px] text-muted-foreground">Llega pronto</span>
    </div>
  );
}

export default async function AjustesPage() {
  const { premium, trialDaysLeft } = await requireAppContext();
  return (
    <AppScreen title="Ajustes">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
        <section aria-labelledby="ajustes-entreno">
          <h2 id="ajustes-entreno" className="wz-rule-title">
            Mi entreno
          </h2>
          <Soon label="Limitaciones" />
          <Soon label="Mi gimnasio" />
          <Soon label="Foco y días" />
        </section>
        <section aria-labelledby="ajustes-preferencias">
          <h2 id="ajustes-preferencias" className="wz-rule-title">
            Preferencias
          </h2>
          <Soon label="Tema" />
          <Soon label="Contador de descanso" />
        </section>
        <section aria-labelledby="ajustes-suscripcion">
          <h2 id="ajustes-suscripcion" className="wz-rule-title">
            Suscripción
          </h2>
          <div className="wz-rule-row">
            <span>Estado</span>
            <span className="wz-rule-value font-bold">
              {premium && trialDaysLeft !== null ? `Prueba premium, ${trialDaysLeft} días` : premium ? "Premium" : "Gratis"}
            </span>
          </div>
        </section>
        <section aria-labelledby="ajustes-cuenta">
          <h2 id="ajustes-cuenta" className="wz-rule-title">
            Cuenta y privacidad
          </h2>
          <Soon label="Retirar el consentimiento" />
          <Soon label="Borrar la cuenta" />
          <SalirButton />
        </section>
      </div>
      <p className="m-0 text-[13px] text-muted-foreground">
        BUDDY no es consejo médico ni sustituye a un entrenador certificado. Si algo duele, para.
      </p>
    </AppScreen>
  );
}
