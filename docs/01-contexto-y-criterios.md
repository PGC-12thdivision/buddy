# 01 — Contexto, criterios de entrega y registro de decisiones

Fecha de inicio: 19/10/2026

## 1. Por qué este proyecto (y no Pintoretto)
- Pintoretto requería bastante más definición. Se eligió el compañero de entreno frente al Radar de Empleo porque su valor central no depende de un tercero: el Radar dependía de barridos de LinkedIn, cuyas condiciones prohíben el scraping y la automatización ([LinkedIn — Prohibited software and extensions](https://www.linkedin.com/help/linkedin/answer/a1341387)).
- La lógica (registro, progresión, multiusuario, kcal/TMB) ya está validada con uso real en el artefacto "Sala de Máquinas".

## 2. Criterios de entrega
No hay enunciado escrito de "proyecto final" ni criterios de evaluación: en el correo del 15/09/2026 Alex indicó que emiten el certificado al recibir el proyecto final. Criterio adoptado:

**A. Mínimo exigido (correo de Alex, 09/06/2026, hackathon de cierre)**
- App desplegada, con backend real y al menos una integración funcionando de punta a punta.
- PRD con GStack y plan de construcción con Compound Engineering (skills de Claude Code).
- "Algo pequeño que funcione entero."

**B. Comprometido con Alex (16/09/2026):** proyecto + Loom.

**C. Listón de calidad: Retos 1–9 aplicados a este producto**

| Reto | Entregable aplicado aquí |
|---|---|
| 1 Discovery | Brief y problema del usuario (PRD, sección 1–2) |
| 2 Propuesta y arquitectura | Alcance MVP vs fase 2, mapa de arquitectura, stack justificado |
| 3 Primeras pantallas | Prototipo de 4–6 pantallas principales |
| 4 Supabase | Auth, modelo de datos, RLS, migraciones |
| 5 Diseño UI | Mini sistema de diseño: paleta, tipografía, componentes, estados vacío/carga/error, móvil |
| 6 Salto profesional | Repo con README y flujo de ramas; Vercel prod + staging; Stripe test (pago → BBDD → acceso inmediato, error claro si falla); Resend con 3 emails (bienvenida, confirmación de compra con nombre del producto en el asunto y enlace, detección de inactividad > 2 semanas); documento de 3 mejoras con Claude Code (problema, por qué, prompt, resultado) |
| 9 Documentación | Técnica (arquitectura, diagrama BBDD, variables de entorno, arranque local, 3–5 decisiones); guía de uso no técnica; documento de entrega (accesos, alcance vs fase 2, mantenimiento y costes); todo enlazado desde un índice |
| Todos | Loom explicando el trabajo |

Fuentes: enunciados "[RETO 6] El salto profesional" y "[RETO 9] La documentación" en la plataforma del camp (app.heartbeat.chat/nocodehackerssocial); correos de Alex del 09/06/2026 y 15/09/2026.

## 3. Registro de decisiones

| # | Fecha | Decisión | Motivo |
|---|---|---|---|
| D1 | 19/10 | Producto: compañero de entreno basado en Sala de Máquinas | Lógica validada, sin dependencia externa crítica |
| D2 | 19/10 | Reconstrucción desde cero (opción B del Reto 6) con Claude Code | Los artefactos son HTML de un archivo dependiente de `window.claude` |
| D3 | 19/10 | Modelo híbrido: IA para el plan inicial y ajustes; reglas para la progresión | Personalización con coste bajo y comportamiento predecible |
| D4 | 19/10 | Freemium: plan inicial gratis; progresión, check-in de sensaciones y ajuste del plan en premium | Ver PRD, sección 14 |
| D5 | 19/10 | Dos proyectos Supabase Free (staging y prod) | El plan Free permite 2 proyectos activos; el branching nativo requiere Pro ([Supabase Pricing](https://supabase.com/pricing.md)) |
| D6 | 19/10 | Vercel Hobby con staging por rama | Los entornos personalizados son de Pro; el staging por rama funciona en Hobby ([Vercel KB](https://vercel.com/kb/guide/set-up-a-staging-environment-on-vercel)) |
| D7 | 19/10 | Sin dominio propio: URLs `*.vercel.app`; Resend solo envía a la dirección de Pablo | Limitación documentada en el doc de entrega |
| D8 | 19/10 | IA vía API de Anthropic (Console), clave solo en servidor | La suscripción de Claude no cubre la API ([soporte Claude](https://support.claude.com/en/articles/9876003-i-have-a-paid-claude-subscription-pro-max-team-or-enterprise-plans-why-do-i-have-to-pay-separately-to-use-the-claude-api-and-console)) |
| D9 | 19/10 | El check-in semanal con ajuste IA se mantiene en el MVP | Es el diferencial de la demo; Pablo prioriza que se vea la parte inteligente |
| D10 | 19/10 | Primera sesión de calibración; la IA no propone pesos iniciales | La IA no adivina cargas; criterio 2–3 RIR (ACSM 2026) |
| D11 | 19/10 | Cribado: cualquier "sí" bloquea + disclaimer permanente; la pregunta articular deriva a limitaciones; embarazo bloquea | Guardarraíl del proyecto; evitar que una rodilla tocada excluya al usuario |
| D12 | 19/10 | Registro entre "Mi gimnasio" y el consentimiento | Más conversión; ningún dato de salud sin cuenta |
| D13 | 19/10 | Edición acotada (hacer después / sustituir / saltar), deterministas; sin edición libre | Respeta topes y exclusiones; sin coste de IA |
| D14 | 19/10 | Foto de máquina en el MVP: clasificación contra catálogo, foto nunca almacenada; no reconocida → descripción en texto para el admin | Mantiene el catálogo cerrado; privacidad. Último en el orden de build |
| D15 | 19/10 | Panel de admin con analítica de producto vinculada a usuario, sin datos de salud | Visión de producto real; RGPD (finalidad del consentimiento) |
| D16 | 19/10 | Guardado local y envío al reconectar en el MVP; PWA offline completa en fase 2 | Mala cobertura en gimnasios; coste |
| D17 | 19/10 | Objetivo como "foco": Equilibrado (por defecto), Más fuerza, Más músculo, Perder grasa | Los objetivos se solapan en principiantes/intermedios (ACSM 2026; Barakat 2020) |
| D18 | 19/10 | Máquinas de cardio en el catálogo; bloque opcional en Perder grasa | El foco de grasa necesita cardio; nutrición fuera del MVP |
| D19 | 19/10 | Actividades externas: registro + pregunta en el wizard + contexto del check-in; recalibración automática en fase 2 | Sin guía reconocida para reglas de ajuste; ACSM 2026: datos insuficientes sobre entreno concurrente |
| D20 | 19/10 | Plantilla de sesiones determinista por días; la IA solo elige ejercicios | Plan predecible y validable |
| D21 | 19/10 | Doble progresión con incrementos reales de máquina | Implementa ACSM 2009; resuelve saltos de placa que el % no permite |
| D22 | 19/10 | La IA nunca toca cargas; la subida la propone la regla automáticamente | Predecible y explicable sin que el usuario tenga que decidir |
| D23 | 19/10 | Descanso: contador pasivo sin alarma | Pablo lo ve pesado; ACSM 2026: el descanso no cambia la fuerza |
| D24 | 19/10 | Nombre: BUDDY. IA: Claude (API de Anthropic) | Decisión de Pablo |
| D25 | 19/10 | Precio premium: 5 €/mes [hipótesis] | Franja baja frente a referencias (Hevy, Strong, SensAI, Fitbod; ver PRD sección 14) |
| — | 19/10 | Copyright del PAR-Q+: riesgo conocido, aceptado para la demo | Se revisa si el producto evoluciona |

## 4. Abierto
- Modelo de IA por uso: Sonnet 5.5 o Haiku 5.5 (se mide en el build).
- Foto de máquina: ¿gratis o premium? ¿Límite por usuario?
- Prueba premium de 14 días [hipótesis].
- Redacción del cribado frente al PAR-Q+ oficial.
- Política de retención de la API de Anthropic para las fotos.
- Re-estimación del build.
