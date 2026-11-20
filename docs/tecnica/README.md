# Documentación técnica de BUDDY

Para quien tenga que arrancar, mantener o ampliar BUDDY. La descripción funcional manda en el PRD (`docs/02-prd-v1.md`). Las reglas no negociables están en `CLAUDE.md`, "Guardarraíles del dominio".

## 1. Arquitectura

El diagrama y la descripción de capas están en el documento de entrega: [`docs/entrega/entrega.md`, sección 5](../entrega/entrega.md#5-arquitectura). El diseño técnico de alto nivel, con las decisiones KTD1–KTD20, está en [`plan.md`](../../plan.md).

En resumen:
- **Next.js 16 (App Router) en Vercel**, región de funciones `fra1` (`vercel.json`). Las pantallas son Server Components. Las escrituras van por Server Actions (`src/app/actions/`, `src/app/(wizard)/actions.ts`) y por route handlers (`src/app/api/`).
- **Dominio puro** en `src/lib/domain/`: cribado, exclusión por zonas, plantilla, topes de volumen, calibración, doble progresión, "es premium" y límites de IA. Son funciones sin E/S y todas tienen su test.
- **IA** (`src/lib/ai/`): solo desde el servidor (`/api/plan` y `/api/checkin`). La salida se valida con zod contra el catálogo y los topes. El prompt se construye con una lista cerrada de campos (`src/lib/domain/prompt-fields.ts`).
- **Supabase** (Auth + Postgres con RLS): ver [`base-de-datos.md`](base-de-datos.md).
- **Stripe** en modo test (`src/app/api/stripe/`: `checkout`, `portal`, `estado` y `webhook`) y **Resend** (`src/lib/email/`, cron diario en `src/app/api/cron/inactividad`).

## 2. Variables de entorno

Plantilla sin valores: [`.env.example`](../../.env.example). En local van en `.env.local`, que está en `.gitignore`. En Vercel, en Settings → Environment Variables, separadas por entorno (Production y Preview de `staging`).

Contrastado con `src/` el 20/11/2026 (búsqueda de `process.env` y de `serverVar`).

| Variable | Dónde se usa | Lado | Obligatoria |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/env.ts` (`publicEnv`), clientes de `src/lib/supabase/` | Cliente y servidor | Sí |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `src/lib/env.ts`. Debe empezar por `sb_publishable_` (D26) | Cliente y servidor | Sí |
| `SUPABASE_SECRET_KEY` | `src/lib/env.server.ts` → `src/lib/supabase/admin.ts`. Debe empezar por `sb_secret_` | Solo servidor | Sí |
| `ANTHROPIC_API_KEY` | `src/lib/ai/client.ts` | Solo servidor | Para generar el plan y el check-in |
| `STRIPE_SECRET_KEY` | `src/lib/stripe.ts` | Solo servidor | Para Premium |
| `STRIPE_WEBHOOK_SECRET` | `src/lib/stripe.ts` → `src/app/api/stripe/webhook/route.ts` | Solo servidor | Para que el pago active premium |
| `STRIPE_PRICE_ID` | `src/lib/stripe.ts` (precio de la suscripción) | Solo servidor | Para Premium |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Está en `.env.example` y en `CLAUDE.md`, pero hoy no se lee en `src/`: Checkout se abre con una redirección desde el servidor | Cliente | No |
| `RESEND_API_KEY` | `src/lib/email/send.ts`, llamado desde `src/lib/email/transactional.ts` y el cron | Solo servidor | Para los emails |
| `EMAIL_ALLOWLIST` | `src/lib/email/send.ts`. Direcciones separadas por comas. Fuera de producción, sin lista no se envía nada (D7) | Solo servidor | No |
| `EMAIL_FROM` | `src/lib/email/send.ts`. Por defecto, el remitente de pruebas de Resend | Solo servidor | No |
| `APP_URL` | `src/lib/email/send.ts`, URL base de los enlaces de los emails. Si falta, usa la URL que da Vercel | Solo servidor | No |
| `CRON_SECRET` | `src/app/api/cron/inactividad/route.ts`. Sin ella, el cron se rechaza | Solo servidor | Para el email de inactividad |

Las pone Vercel, no hay que definirlas: `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_BRANCH_URL` y `VERCEL_PROJECT_PRODUCTION_URL` (las lee `src/lib/email/send.ts`).

Solo para tests y scripts: `RUN_RLS_TESTS` y `RUN_PLAN_EVAL` (las activa Vitest según el modo), `PLAYWRIGHT_CORE` (ruta opcional a `playwright-core` para `scripts/e2e/` y `scripts/demo/`) y `DEMO_OUT`, `DEMO_SRT` y `DEMO_KEEP` (`scripts/demo/grabar.mjs`).

Reglas:
- Las variables `NEXT_PUBLIC_*` acaban en el navegador. Ninguna clave secreta puede llevar ese prefijo.
- Los módulos de servidor importan `server-only`, así que un import desde el cliente rompe el build.
- Si falta una variable, el error nombra la variable, nunca su valor (`src/lib/env.ts`).

## 3. Arranque local (PowerShell)

Requisitos: Node 24 y Git. No hace falta Docker: no hay Supabase local y se trabaja contra el proyecto de staging.

```powershell
git clone https://github.com/PGC-12thdivision/buddy.git
cd buddy
npm install
Copy-Item .env.example .env.local
notepad .env.local    # rellena las claves de STAGING, nunca las de prod
npm run dev           # http://localhost:3000
```

Para que funcione todo el recorrido:
- Con las tres variables de Supabase ya se puede recorrer el wizard y la app.
- Sin `ANTHROPIC_API_KEY` no se genera el plan.
- Sin las de Stripe, la pantalla Premium no abre el pago.
- Sin `RESEND_API_KEY` no se envían emails. Fuera de producción, además, solo se envía a las direcciones de `EMAIL_ALLOWLIST`.
- Supabase Free pausa los proyectos tras un periodo sin actividad. Si staging no responde, comprueba eso primero.

Otros comandos:

```powershell
npm run lint
npm run typecheck   # next typegen + tsc
npm run build       # lo mismo que ejecuta Vercel
```

## 4. Migraciones

- Viven en `supabase/migrations/` (10 a fecha de entrega). Cada cambio de esquema es una migración nueva en el repo. **Nunca** se edita la base de prod a mano.
- Se aplican con la CLI de Supabase, instalada como devDependency: primero en staging y, tras probar, en prod.

```powershell
npx supabase projects list            # comprueba a qué proyecto está vinculada la CLI
npx supabase link --project-ref <ref> # staging o prod (los refs están en CLAUDE.md)
npx supabase migration new <nombre>   # crea el archivo vacío
npx supabase db push                  # aplica las migraciones pendientes al proyecto vinculado
```

- La integración Supabase ↔ GitHub está conectada, pero con "Deploy to production" desactivado a propósito.
- Patrón para la lógica de servidor (KTD16): la función vive en el esquema `private` con `search_path` vacío, y un envoltorio en `public` que solo puede ejecutar `service_role`.

## 5. Tests

| Qué | Comando | Notas |
|---|---|---|
| Unitarios (Vitest) | `npm test` | Dominio, Server Actions, rutas de la API, webhook, cron, campos del prompt y log seguro. Viven junto al código como `src/**/*.test.ts`. Un archivo: `npx vitest run src/ruta/archivo.test.ts` |
| RLS contra staging | `npm run test:rls` | `src/lib/supabase/rls.integration.test.ts`. Lee las claves de `.env.local`, crea dos usuarios con la API admin y los borra al terminar. Solo contra staging |
| Evaluación de la IA | `npm run eval:plan` | 10 perfiles fijos, Sonnet frente a Haiku, con coste real. Resultado en [`docs/eval-plan.md`](../eval-plan.md) |
| E2E con Playwright contra staging | `node scripts/e2e/<script>.mjs [baseUrl]` | Ver la lista de abajo. Se niegan a correr si `.env.local` no apunta a staging. Necesitan `playwright-core`: por defecto lo buscan en la instalación global de `@playwright/cli`, o en la ruta de `PLAYWRIGHT_CORE` |

Scripts E2E (`scripts/e2e/`):
- `ciclo.mjs <perfil.json>`: ciclo completo de un usuario. Hay 9 perfiles en `scripts/e2e/perfiles/`, por ejemplo `node scripts/e2e/ciclo.mjs scripts/e2e/perfiles/p01-hombro-3d.json`.
- `alta.mjs`: alta real por la UI, de la bienvenida al plan, con las dos variantes del cribado.
- `checkin.mjs`: check-in del coach de punta a punta, con IA real.
- `reanudar.mjs`: reanudar una sesión a medias (doble toque, recarga, botón atrás).
- `memoria.mjs`: persistencia y progresión entre días (cinco sesiones simuladas).

`alta.mjs`, `reanudar.mjs` y `memoria.mjs` llegaron en el commit `7104c38` de la rama `feature/cierre-entrega`. Si ya están en `main` y su último resultado: pendiente de confirmar.

## 6. Decisiones técnicas clave

El registro completo, con fecha y motivo, está en [`docs/01-contexto-y-criterios.md` §3](../01-contexto-y-criterios.md#3-registro-de-decisiones).

1. **La IA elige ejercicios; las reglas, los pesos (D3, D20, D22, D53).** Calibración y doble progresión son funciones puras con tests (`src/lib/domain/calibration.ts`, `progression.ts`). La IA solo elige el ejercicio de cada hueco de un catálogo cerrado. Series, títulos y cardio los pone el código. El servidor fija la carga al guardar, y el usuario no puede escribir `exercise_state`.
2. **Ningún dato de salud llega a la IA (D29, D44).** El prompt usa una lista cerrada de campos con test. El catálogo que ve la IA solo se filtra por equipo. Las limitaciones y las Molestias se aplican después, con la exclusión determinista y el refiltrado (D35), que nunca deja una sesión vacía (D68).
3. **Límite de IA y guardado del plan en transacciones SQL (D54).** `reserve_ai_call` y `save_plan` bloquean por usuario: dos peticiones a la vez no pasan las dos, y el límite solo se gasta si el plan queda guardado. Cada llamada deja en `ai_calls` el tipo, los tokens y el coste.
4. **Dos proyectos de Supabase Free y staging por rama en Vercel Hobby (D5, D6).** Supabase Free no tiene branching y Vercel Hobby no tiene entornos personalizados. Con dos proyectos y la rama `staging` como preview, se prueba cada cambio antes de prod sin coste.
5. **Claves nuevas de Supabase (D26).** `sb_publishable_…` y `sb_secret_…` en lugar de `anon` y `service_role`, que dejan de funcionar a finales de 2026. La validación de `src/lib/env.ts` rechaza el formato antiguo.
