# 03 — Stack, entornos y logística de trabajo

## Stack
| Pieza | Elección |
|---|---|
| Código | Claude Code en el PC de Pablo (Windows) |
| Frontend y backend web | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui |
| Base de datos y auth | Supabase: proyecto `staging` y proyecto `prod` (Free); migraciones versionadas en el repo con Supabase CLI; MCP de Supabase para inspeccionar |
| IA | API de Anthropic (Console), llamada solo desde rutas de servidor |
| Pagos | Stripe en modo test: Checkout + webhook |
| Emails | Resend: bienvenida, confirmación de compra e inactividad (cron diario) |
| Despliegue | Vercel Hobby: `main` → producción; rama `staging` → preview con variables propias |
| Método | GStack (PRD) y Compound Engineering (plan), instaladas como skills de Claude Code |

## Flujo de ramas
`feature/<tarea>` → PR a `staging` → prueba en la URL de staging → PR a `main` → producción. Nada directo a `main` (rama protegida). Commits pequeños y frecuentes.

## Variables de entorno (por entorno)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`.
Ninguna clave en el repo; en local, `.env.local` (dentro de `.gitignore`).

## Dónde se trabaja cada cosa
| Qué | Dónde |
|---|---|
| Producto, cuestionario, reglas, diseño | Proyecto de Claude (chat) |
| Código, migraciones, deploy | Claude Code sobre el repo |
| Fuente de verdad técnica | `CLAUDE.md` y `plan.md` en el repo |
| Documentación de entrega (Reto 9) | `/docs` en el repo + README (índice opcional en Notion) |

## Fases
| Fase | Pablo | Claude |
|---|---|---|
| 0. Bases ✓ | Cuentas, proyectos y accesos | Esqueleto del repo, ramas, Vercel, Supabase ×2 |
| 1. Producto ✓ | Decide alcance, cuestionario y reglas | PRD v1 cerrado (19/10); revisión con GStack en Claude Code |
| 2. Diseño | Lidera flujos y pantallas | Propone y prototipa; mini sistema de diseño |
| 3. Plan | Valida el modelo de datos | Plan con Compound Engineering, esquema y RLS |
| 4. Build | Revisa los PR en staging | Orden de construcción en `CLAUDE.md` (propuesta), confirmado en `plan.md` |
| 5. Cierre | Graba el Loom | Docs técnicas, guía de uso, entrega y documento de 3 mejoras |

Estimación: entrega el **viernes 6/11/2026**, con unas 6 sesiones de 5 h (D33). Como el alcance supera ese tiempo, el PRD v1.1 (sección 20) fija una línea de corte "demo completa"; el plan de Compound Engineering detalla el reparto.

## Checklist de la fase 0 (Pablo)
- [x] Crear el proyecto de Claude y subir estos documentos.
- [x] Repo en GitHub (público): `PGC-12thdivision/buddy`, ramas `main` (protegida) y `staging`.
- [x] Copiar al repo: `CLAUDE.md` en la raíz; `01-contexto-y-criterios.md`, `02-prd-v1.md` y `03-stack-y-logistica.md` en `docs/`.
- [x] Dos proyectos Supabase en la región UE: `staging` y `prod`.
- [ ] API key de Anthropic en la Console, con créditos.
- [ ] Stripe en modo test y Resend: claves disponibles (las cuentas ya existen).
- [x] Vercel conectado a GitHub, con variables de Supabase en Production (prod) y Preview de `staging` (staging).
