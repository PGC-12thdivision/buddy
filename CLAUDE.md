# CLAUDE.md — BUDDY

Guía para Claude Code en este repo. Léela entera antes de cualquier tarea.

## Qué es BUDDY
Web app (móvil primero) para personas que entrenan por su cuenta en gimnasio: un wizard de onboarding genera un plan con IA a partir de su foco, disponibilidad, equipo de su gimnasio y limitaciones. Después registran cada sesión, y unas reglas deterministas les dicen qué peso toca. Es el proyecto final del bootcamp Vibe Code Builder (No Code Hackers), con vocación de poder evolucionar a producto real.

## Documentos de referencia (fuente de verdad funcional)
- `docs/02-prd-v1.md`: PRD. Ante cualquier duda funcional, manda el PRD.
- `docs/01-contexto-y-criterios.md`: criterios de entrega y registro de decisiones (D1–D25).
- `docs/03-stack-y-logistica.md`: stack, entornos y fases.
- `plan.md`: plan de construcción (lo genera Compound Engineering; hasta entonces no existe).

Si el código y el PRD se contradicen, para y pregunta. No resuelvas la contradicción por tu cuenta.

## Estado actual
**Fase 0: bases.** Esqueleto del repo, ramas, Vercel y los dos proyectos Supabase. Después: revisión del PRD con GStack → diseño (prototipo y mini sistema de diseño) → plan con Compound Engineering → build.

## Comandos
- `npm run dev`: servidor local (http://localhost:3000).
- `npm run build`: build de producción (lo mismo que ejecuta Vercel).
- `npm run lint` · `npm run typecheck` (genera los tipos de rutas con `next typegen` y luego `tsc`).
- `npm test`: Vitest una vez. `npm run test:watch`: modo watch. Un solo archivo: `npx vitest run src/ruta/archivo.test.ts`; un solo test: añade `-t "nombre del test"`.
- Supabase CLI (instalada como devDependency, siempre con `npx`): `npx supabase migration new <nombre>`, `npx supabase db push` (aplica las migraciones al proyecto vinculado; comprueba antes con `npx supabase projects list` cuál es).
- Los tests viven junto al código como `src/**/*.test.ts`.

**Next.js 16:** lee `AGENTS.md`. Esta versión tiene cambios incompatibles con lo que puedas saber de memoria; consulta `node_modules/next/dist/docs/` antes de escribir código de Next.

## Stack
- Next.js (App Router) + TypeScript (`strict`) + Tailwind + shadcn/ui.
- Supabase: Auth, Postgres con RLS y migraciones versionadas con Supabase CLI. Dos proyectos Free en la región UE: `staging` y `prod`. Los proyectos Free se pausan tras un periodo sin actividad; si staging no responde, comprobar eso primero.
  - Project refs: **staging** `jrzicjoyraqhwioeinwa` · **prod** `pfxyjotwlwvegqyzrrwl`. Antes de cualquier `db push`, comprueba a qué ref está vinculada la CLI.
- IA: API de Anthropic (Claude), llamada **solo desde rutas de servidor**. El modelo por uso (Sonnet 5.5 o Haiku 5.5) se decide midiendo calidad y coste.
- Stripe en modo test (Checkout + webhook).
- Resend: 3 emails (bienvenida, confirmación de compra, inactividad > 14 días por cron diario). Sin dominio propio solo puede enviar a la dirección de Pablo (D7): los envíos a otras direcciones fallarán.
- Tests: Vitest (obligatorio para las funciones de carga).
- Vercel Hobby: `main` → producción; `staging` → preview con variables propias.
- Entorno de Pablo: Windows. Los comandos deben funcionar en PowerShell.

## Ramas y despliegue
- `feature/<tarea>` → PR a `staging` → Pablo prueba en la URL de staging → PR a `main` → producción.
- **Nunca** hagas commit o push directo a `main`. Única excepción, ya autorizada: el commit inicial del esqueleto.
- Repo público en GitHub: revisa cada commit para que no se cuele ninguna clave ni dato personal.
- Commits pequeños y frecuentes, con mensajes descriptivos.
- Los cambios de esquema van siempre como migración en el repo. Nunca se edita la BBDD de prod a mano. El MCP de Supabase se usa para inspeccionar, no para cambiar prod.

## Variables de entorno
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`.
- Ninguna clave en el repo. En local van en `.env.local`, que está en `.gitignore`. Mantén un `.env.example` sin valores.
- Las claves de servidor (`SUPABASE_SECRET_KEY`, `ANTHROPIC`, `STRIPE_SECRET`, `RESEND`) no pueden aparecer nunca en código de cliente.
- Supabase usa las claves nuevas (`sb_publishable_…` / `sb_secret_…`), no las legacy `anon` / `service_role` (D26). Van en la cabecera `apikey`, nunca en `Authorization: Bearer`.

## Guardarraíles del dominio (no negociables)
Traducidos a reglas de ingeniería:

1. **No es consejo médico.** El disclaimer aparece en la bienvenida, en la pantalla del plan y en los términos.
2. **Catálogo cerrado.** La IA solo puede devolver IDs de ejercicios y tipos de equipo que existan en el catálogo. Toda salida de IA se valida contra un esquema (zod). Si no valida, se reintenta y, como último recurso, se muestra un error claro al usuario. Nunca se guarda una salida no validada.
3. **La IA nunca toca cargas.** Los pesos los calculan funciones puras deterministas (calibración y doble progresión, PRD secciones 8 y 10), cubiertas por tests unitarios. La IA solo elige ejercicios (plan inicial) y ajusta volumen y ejercicios dentro de topes (check-in, PRD sección 11).
4. **Topes de volumen** validados en código, no en el prompt: suelo de ≥2 veces por semana por grupo muscular principal, techo de 20 series por grupo y semana, y mínimo de 2 series por ejercicio.
5. **Cribado.** Una respuesta de riesgo bloquea la generación del plan. La excepción es la pregunta articular, que obliga a marcar la zona en limitaciones (PRD sección 13).
6. **Limitaciones → exclusión determinista** por etiquetas de articulaciones. Sin texto libre.
7. **"Molestia" = parar** ese ejercicio hoy, sin subida de carga y con el ejercicio marcado. Nunca se "empuja".
8. **RGPD.** Los datos de salud son categoría especial:
   - Consentimiento explícito, con casilla sin premarcar, antes de guardar cualquier dato de salud.
   - Mínimo dato necesario: no se piden peso, altura ni sexo.
   - **Ningún dato de salud en eventos de analítica, en logs ni en mensajes de error.**
9. **Fotos de máquinas: nunca se persisten.** Nada en Storage, BBDD ni logs. Se procesan en memoria en la ruta de servidor y se descartan. No registres el cuerpo de esas peticiones.
10. **RLS activado en todas las tablas.** Cada usuario solo ve sus datos; el panel de admin va por rol.
11. Solo mayores de 18 años (confirmación en el registro).
12. Límite de generaciones de IA por usuario, y registro de cada llamada (tipo, tokens y coste aproximado) para el panel de admin.

## Freemium (PRD sección 14)
Premium: sugerencia de carga diaria (doble progresión), check-in semanal con ajuste IA, regenerar plan y gráficas completas. El resto es gratis. El acceso se controla por `subscription_status`, que actualiza el webhook de Stripe.

## Fuera de alcance (fase 2): no construir
Multi-gimnasio, nutrición y kcal, wearables, Apple Health, Notion, recalibración automática por actividades externas, PWA offline completa, edición libre del plan, app nativa, dominio propio.

## Orden de construcción [propuesta: se confirma en `plan.md`]
1. Auth + wizard de onboarding + cribado.
2. Catálogo + generación del plan.
3. Sesión del día + calibración + progresión.
4. Check-in semanal.
5. Stripe.
6. Resend.
7. Panel de admin y analítica.
8. Foto de máquina (la última: es la primera candidata a recortar).

## Cómo trabajar con Pablo
- Pablo decide alcance, reglas y diseño; tú ejecutas. No avances de fase sin su confirmación.
- **Diagnostica antes de ejecutar:** revisa el código, el esquema y la documentación existentes antes de generar nada nuevo.
- Haz como máximo 2–3 preguntas por turno, ordenadas por impacto.
- No inventes datos, versiones ni APIs. Si no puedes verificar algo, dilo: "No puedo confirmar esto".
- Justifica las decisiones técnicas no triviales con pros y contras reales. Añade las relevantes al registro de decisiones.
- Responde en español. La UI de la app va en español.
- Cada PR lleva una descripción breve: qué cambia, cómo probarlo en staging y si toca esquema o variables de entorno.
