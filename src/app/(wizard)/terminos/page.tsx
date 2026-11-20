import type { Metadata } from "next";
import type { ReactNode } from "react";
import { WizardScreen } from "@/components/wizard/ui";

export const metadata: Metadata = { title: "Términos y aviso médico · BUDDY" };

// Términos de uso, aviso médico y resumen de privacidad (guardarraíl 1: el disclaimer aparece
// también "en los términos"). Página pública: se enlaza desde la bienvenida, el registro y Ajustes.
const UPDATED = "20 de noviembre de 2026";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="wz-rule-title m-0">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Terminos() {
  return (
    <WizardScreen sober backHref="/" title="Términos y aviso médico" subtitle={`Última actualización: ${UPDATED}.`}>
      <div className="flex flex-col gap-6 pb-6 text-[15px] leading-relaxed [&_li]:ml-5 [&_li]:list-disc [&_p]:m-0">
        <Section id="t-medico" title="1. Aviso médico">
          <p>
            <b>BUDDY no es consejo médico ni sustituye a un médico, fisioterapeuta o entrenador certificado.</b> Los
            planes, las cargas sugeridas y los mensajes del coach son orientativos y se basan solo en lo que tú
            respondes.
          </p>
          <ul>
            <li>Antes de empezar un programa de fuerza, consulta con un profesional sanitario si tienes una lesión, una enfermedad, estás embarazada, tomas medicación o tienes cualquier duda sobre tu salud.</li>
            <li>Si sientes dolor, mareo, falta de aire o cualquier síntoma anómalo, para de inmediato. En la sesión, marca “Molestia”: BUDDY detiene ese ejercicio hoy y no sube la carga.</li>
            <li>Las preguntas de seguridad del principio no son un diagnóstico. Si alguna respuesta indica riesgo, BUDDY no genera el plan y te recomienda consultar antes con un profesional.</li>
            <li>Tú respondes de la veracidad de tus respuestas y de usar una técnica y unas cargas adecuadas. Entrenas bajo tu propia responsabilidad.</li>
          </ul>
        </Section>

        <Section id="t-servicio" title="2. Qué es BUDDY">
          <p>
            BUDDY es una aplicación web para planificar y registrar entrenamientos de fuerza en el gimnasio. Es el
            proyecto final del bootcamp Vibe Code Builder y funciona como demostración: puede tener errores, cambiar o
            dejar de estar disponible sin previo aviso.
          </p>
          <p>
            La inteligencia artificial solo elige ejercicios de un catálogo cerrado y ajusta el volumen dentro de unos
            topes fijos. <b>Nunca decide los pesos</b>: los calculan reglas fijas a partir de lo que registras.
          </p>
        </Section>

        <Section id="t-cuenta" title="3. Tu cuenta">
          <ul>
            <li>Debes tener 18 años o más.</li>
            <li>La cuenta es personal. Cuida tu contraseña y no la compartas.</li>
            <li>Puedes borrar tu cuenta cuando quieras desde Ajustes → Cuenta y privacidad. Se borran tus datos y, si tienes una suscripción, se cancela antes.</li>
            <li>No uses BUDDY para fines ilegales ni intentes acceder a datos de otras personas o alterar el servicio.</li>
          </ul>
        </Section>

        <Section id="t-premium" title="4. Premium, prueba y pagos">
          <ul>
            <li>El plan, el registro de sesiones y la carga sugerida de cada día son gratis.</li>
            <li>Las funciones con IA (como el coach que explica tu semana) son premium. Al crear la cuenta tienes 14 días de prueba sin tarjeta.</li>
            <li>Los pagos se gestionan con Stripe. <b>Mientras BUDDY sea una demostración, Stripe funciona en modo de prueba y no se cobra dinero real.</b></li>
            <li>Puedes cancelar la suscripción en cualquier momento desde Ajustes → Gestionar.</li>
          </ul>
        </Section>

        <Section id="t-datos" title="5. Tus datos y tu salud">
          <p>
            Tus limitaciones y tus respuestas de seguridad son datos de salud. Solo los guardamos si das tu
            consentimiento explícito, y puedes retirarlo en Ajustes: entonces borramos tus datos de salud y tu plan se pausa hasta que vuelvas a darlo.
          </p>
          <ul>
            <li>Pedimos el mínimo: no te pedimos peso, altura ni sexo.</li>
            <li>Usamos tus datos solo para crear tu plan, calcular tus cargas y mostrarte tu progreso. No los vendemos ni los usamos para publicidad.</li>
            <li>Ningún dato de salud se envía a la IA ni aparece en registros técnicos o de analítica.</li>
            <li>
              Proveedores que tratan datos por cuenta de BUDDY: Supabase (base de datos y cuentas, en la UE), Vercel
              (alojamiento), Anthropic (IA, sin datos de salud), Stripe (pagos) y Resend (emails).
            </li>
            <li>Conservamos tus datos mientras tengas cuenta. Al borrarla, se eliminan.</li>
            <li>
              Tienes derecho a acceder, rectificar, borrar y llevarte tus datos, a oponerte a su uso y a reclamar ante la
              Agencia Española de Protección de Datos (aepd.es).
            </li>
          </ul>
        </Section>

        <Section id="t-responsabilidad" title="6. Responsabilidad">
          <p>
            BUDDY se ofrece “tal cual”, sin garantía de resultados ni de disponibilidad continua. En la medida en que lo
            permita la ley, no respondemos de lesiones o daños derivados de entrenar con las sugerencias de la app ni de
            interrupciones del servicio. Nada de esto limita los derechos que te reconoce la normativa de consumidores.
          </p>
        </Section>

        <Section id="t-cambios" title="7. Cambios y ley aplicable">
          <p>
            Podemos actualizar estos términos. Si el cambio es importante, te avisaremos en la app. Se rigen por la ley
            española.
          </p>
        </Section>
      </div>
    </WizardScreen>
  );
}
