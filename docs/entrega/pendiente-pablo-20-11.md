# Decisiones y pasos pendientes para Pablo (20/11/2026)

Lista para los 15 minutos finales, ordenada por impacto. Cada punto dice qué decidir, mi recomendación y qué pasa si no se hace nada.

## 1. Alta en prod: hoy solo te puedes dar de alta tú (BLOQUEANTE para que otros prueben)

**Qué pasa:** prod usa el SMTP integrado de Supabase, con "Confirm email" activado y sin SMTP propio (comprobado en el panel el 20/11). Según la documentación de Supabase, ese SMTP:
- **solo envía a los emails del equipo** de la organización; cualquier otra dirección falla con `email_address_not_authorized`;
- tiene un tope de envíos por hora para todo el proyecto. En staging ya saltó hoy (`over_email_send_rate_limit`).

En resumen: un evaluador o un compañero que se registre en prod verá un error y no podrá entrar.

**Opciones:**

| Opción | Pros | Contras |
|---|---|---|
| **A. Desactivar "Confirm email" en prod** (recomendada) | Cualquiera puede probar la app hoy. El código ya está preparado: si Supabase abre sesión al registrarse, la app salta "Revisa tu correo" y va directa al consentimiento, con test y E2E. Desaparece también el tope de envíos | Cualquiera puede registrarse con un email que no es suyo. Para la demo del bootcamp es aceptable; antes de abrir a usuarios reales hay que reactivarlo con SMTP y dominio propio (se añade a TODOS) |
| B. SMTP propio con Resend | Mantiene la verificación | Sin dominio propio, Resend solo entrega a tu dirección (D7): el mismo problema |
| C. No tocar nada | Ningún cambio de configuración | Solo tú puedes darte de alta. Para la demo te vale una cuenta tuya, pero nadie más puede probar |

**Cómo se hace A (1 minuto):** Supabase → buddy-prod → Authentication → Sign In / Providers → desactiva "Confirm email" → Save. Es un cambio de configuración de tu cuenta, así que lo haces tú o me das el "sí" explícito.

## 2. Stripe en prod: falta el webhook (sin él, el pago no activa premium)

En Vercel → Production están `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` y `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. **Falta `STRIPE_WEBHOOK_SECRET`.** Ahora mismo el webhook de prod responde 500: falla cerrado y no procesa nada, como está diseñado.

Pasos (unos 5 minutos; no pegues ningún secreto en el chat):
1. Stripe (modo **test**) → Developers → Webhooks → Add endpoint:
   - URL: `https://buddy-xi-eight.vercel.app/api/stripe/webhook`. Prod no tiene Vercel Authentication, así que no hace falta el bypass.
   - Eventos: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` y `customer.subscription.deleted`.
2. Copia el "Signing secret" (`whsec_…`) → Vercel → Settings → Environment Variables → `STRIPE_WEBHOOK_SECRET`, **solo Production** → Save.
3. Vercel → Deployments → el último de Production → Redeploy.
4. Stripe → Settings → Billing → Customer portal: actívalo y permite la cancelación.
5. Prueba: Premium → tarjeta `4242 4242 4242 4242` → la vuelta dice que ya eres premium → "Gestionar" → cancelar.

Si no da tiempo: en el Loom enseña el Checkout y explica el webhook, o graba ese tramo en staging con el vídeo de respaldo.

## 3. Pasar a prod las correcciones de hoy

Están en el PR de `feature/cierre-entrega` → `staging` y van validadas con la batería E2E completa:
- **Sesión:** la calibración ya no parpadea un instante a "Serie 2 de 3" al fijar el peso (se perdían toques), y el aviso de "Deshacer" ya no tapa los +/− a 360×640.
- **Registro:** preparado para la opción 1A.
- **Next.js 16.4.3 → 16.4.6**, parche de seguridad.
- Los E2E nuevos, el material de entrega y la documentación que faltaba.

Tu autorización de hoy cubría aplicar lo validado, y lo he dejado aplicado. Ver el estado real en el resumen final del chat.

## 4. Otros puntos (no bloquean)

- **Tu artefacto "Sala de Máquinas" sigue público** y tiene datos personales y de salud tuyos. Ponlo en privado.
- **Voz del Loom:** recomiendo narrar tú en directo con `guion-loom-4min.md`. El vídeo pregrabado (4:37, webm) sirve de respaldo. Opciones en `opciones-voz.md`.
- **Usuario de prueba en staging** `demo-1795180920539@buddy.test`: lo dejó una grabación fallida y el clasificador de permisos bloqueó su borrado. Bórralo a mano en Supabase → staging → Authentication → Users.
- **Supabase (aviso informativo):** la función `rls_auto_enable()` la creó la propia plataforma (activa RLS automáticamente en tablas nuevas). Es `SECURITY DEFINER` y ejecutable por `anon`, pero devuelve `event_trigger`, así que llamarla por RPC no hace nada útil. Riesgo bajo; se puede revocar `EXECUTE` en una migración después de la entrega.
- **Restos cosméticos:**
  - "Quedaban 4+" salta de línea a 320 px;
  - el título del Plan sigue diciendo "torso y pierna" tras D68;
  - la animación de fin de sesión tapa unos segundos la primera fila de "Lo que hiciste".
- **Revisión de textos del catálogo por tu equipo** (PR #20).
