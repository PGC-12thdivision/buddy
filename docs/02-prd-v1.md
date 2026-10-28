# 02 — PRD v1 (listo para GStack)

> Versión 1, 19/10/2026. Sustituye a `02-prd-borrador.md`. Lo marcado **[hipótesis]** está sin validar; lo marcado **[pendiente]** está sin decidir; lo marcado **[propuesta]** es criterio propio sin respaldo explícito en una guía. Decisiones en `01-contexto-y-criterios.md` (D9–D25).

## 1. Problema
Quien entrena por su cuenta en el gimnasio no sabe qué rutina seguir para su objetivo, ni cuándo subir peso, y suele abandonar o estancarse. Un entrenador personal es caro; las apps genéricas no se adaptan a sus limitaciones ni a las máquinas de su gimnasio.

## 2. Usuario objetivo
Adulto (18+) que entrena de forma independiente en un gimnasio con máquinas, de principiante a intermedio, con objetivos a menudo mixtos (perder grasa, ganar músculo y fuerza, sentirse mejor) y quizá alguna limitación física.

## 3. Propuesta de valor
"Tu plan, hecho para ti y para tu gimnasio en 5 minutos, y una sala de máquinas que te dice cada día qué peso toca."

## 4. Alcance

| MVP | Fase 2 |
|---|---|
| Wizard de onboarding (sección 5), registro antes de los datos de salud | Multi-gimnasio |
| Cribado con bloqueo + disclaimer permanente | Nutrición / kcal (TMB) |
| "Mi gimnasio": presets + catálogo visual de tipos de equipo (incluye cardio) | Wearables, Apple Health, Notion |
| Foto de máquina no catalogada → clasificación IA, foto descartada | Recalibración diaria automática por actividades externas |
| Plan inicial: plantilla determinista + IA elige ejercicios del catálogo | App abierta sin conexión (PWA completa) |
| Sesión de calibración | Edición libre del plan |
| Sesión del día: precargado, +/−, contador pasivo, botón "Molestia" | App nativa, dominio propio, emails a cualquier destinatario |
| Hacer después / Sustituir / Saltar (deterministas) | |
| Doble progresión por reglas + sugerencia de carga (premium) | |
| Check-in semanal → ajuste del plan por IA (premium) | |
| Registro de actividades externas (contexto del check-in) | |
| Guardado local y envío al reconectar | |
| Panel de admin + analítica de producto | |
| Stripe test, 3 emails Resend, staging + prod | |

Nota: el alcance ha crecido respecto al borrador (check-in, foto de máquina, panel de admin, actividades externas). La estimación de 3–5 jornadas de `03` deja de ser válida; se re-estima con el plan de Compound Engineering.

## 5. Onboarding (wizard)
Una pregunta por pantalla, barra de progreso, respuestas con tarjetas tocables. Cada pantalla emite eventos de analítica (vista, completada, abandonada, tiempo) sin incluir respuestas de salud.

| # | Pantalla | Contenido |
|---|---|---|
| 1 | Bienvenida | Disclaimer: BUDDY no es consejo médico ni sustituye a un entrenador certificado; el usuario responde de la veracidad de sus respuestas |
| 2 | Foco | **Equilibrado (preseleccionado)** · Más fuerza · Más músculo · Perder grasa |
| 3 | Experiencia | Nunca he entrenado con máquinas · < 6 meses · 6 meses–2 años · > 2 años |
| 4 | Disponibilidad | Días/semana: 2 · 3 · 4 · 5. Minutos/sesión: 30 · 45 · 60 · 75+ |
| 5 | Otros deportes | Opcional, selección múltiple sobre el catálogo de actividades (pádel, correr, natación, clase dirigida, bici…) |
| 6 | Mi gimnasio | Presets (Completo / Básico / Solo peso libre) → desmarcar por zona → "¿Falta una máquina? Haz una foto" |
| — | **Registro** | Email + contraseña + confirmación de mayoría de edad. Las respuestas previas se guardan temporalmente en el dispositivo y se vuelcan a la cuenta |
| 7 | Consentimiento | Casilla sin premarcar: finalidad (generar y ajustar el plan), cómo retirarlo. Sin consentimiento no se continúa (salida clara) |
| 8 | Limitaciones | Zonas: hombro, codo, muñeca, cuello/espalda alta, espalda baja, cadera, rodilla, tobillo, o "Ninguna". Sin texto libre |
| 9 | Cribado | 7 preguntas sí/no (temas del PAR-Q+) + embarazo. Ver sección 13 |
| 10 | Resumen | Todo editable → "Generar mi plan" (estado de carga) |
| 11 | Plan | Plan + "Tu primera sesión es de calibración" |

No se piden peso, altura ni sexo: la calibración evita estimar cargas y las kcal son fase 2 (mínimo dato).

## 6. Mi gimnasio y catálogo
- **Catálogo de tipos de equipo, no de marcas/modelos** (p. ej. "prensa de piernas", "jalón al pecho", "polea doble", "cinta"). Ilustraciones genéricas con estilo único. Tamaño inicial **[propuesta]**: 25–35 tipos, sembrado con las máquinas del gimnasio de Pablo.
- Cada **ejercicio** del catálogo lleva: equipo requerido, patrón de movimiento, región (empuje/tracción × superior/inferior; horizontal/vertical en superior), grupos musculares y articulaciones que carga.
- "Mi gimnasio" es un perfil editable; cambiarlo permite regenerar el plan.
- **Foto de máquina no catalogada:**
  1. La foto se comprime en el móvil, va a una ruta de servidor y se reenvía al modelo con visión. **Nunca se guarda** (ni Storage ni BBDD).
  2. El modelo solo puede responder con un tipo del catálogo o "no reconocida".
  3. Reconocida → se añade a "Mi gimnasio".
  4. No reconocida → se guarda solo una **descripción en texto** generada por el modelo + texto del usuario, como solicitud para el admin.
  5. Aviso: fotografiar solo la máquina, no a personas.
  6. Texto honesto en la app: "no guardamos tu foto; se procesa y se descarta". **[pendiente]** verificar la política de retención de datos de la API de Anthropic antes de afirmar más.
  7. **[pendiente]** ¿Foto gratis o premium? ¿Límite por usuario?

## 7. Generación del plan

**Plantilla determinista por días** (la IA no decide la estructura):

| Días/semana | Plantilla |
|---|---|
| 2–3 | Cuerpo completo en cada sesión |
| 4–5 | Torso / pierna alternos |

Cada sesión tiene huecos por región; **la IA elige ejercicios del catálogo** que cumplen: equipo disponible, no excluidos por limitaciones, patrón del hueco. Salida JSON validada contra esquema; si no valida, se reintenta y, en último caso, error claro.

**Parámetros por foco** **[propuesta]** sobre ACSM 2026 (suelos/techos de volumen, orden, ≥2 series) y ACSM 2009 (rangos de repeticiones):

| Foco | Series/grupo/semana | Repeticiones | Particularidad |
|---|---|---|---|
| Equilibrado | 10–14 | 8–12 | — |
| Más fuerza | 10–14 | Principal: 5–8 · resto: 8–12 | Ejercicio principal primero, 2–3 series |
| Más músculo | 14–20 | 8–15 | — |
| Perder grasa | 10–14 | 8–12 | Bloque de cardio opcional al final + mensaje: la dieta es la palanca principal (nutrición fuera del MVP) |

Guardarraíles fijos:
- Suelo: todos los grupos principales ≥2 veces/semana (recomendación principal ACSM 2026). Si el tiempo no da para 10 series/grupo/semana, se prioriza este suelo y se informa.
- Techo: 20 series/grupo/semana (ACSM 2026: rendimientos decrecientes a partir de ~18–20).
- Mínimo 2 series por ejercicio.
- Esfuerzo objetivo: 2–3 repeticiones en reserva; nunca al fallo.
- Las actividades declaradas en la pantalla 5 se pasan como contexto (p. ej., evitar pierna pesada tras el día de pádel).
- Límite de generaciones por usuario; API key solo en servidor.

## 8. Calibración (primera sesión)
1. Primera serie con carga baja.
2. Tras cada serie: "¿Cuántas más podrías haber hecho?" (0 · 1 · 2 · 3 · 4+).
3. 4+ → sube un incremento; 0–1 o no llega a las repeticiones → baja uno; 2–3 → carga fijada.
4. Máximo 3 series de calibración por ejercicio.

Interfaz propia, distinta de la sesión normal. Criterio 2–3 RIR según ACSM 2026, que advierte que no hay evidencia para fijar objetivos exactos de RIR (es orientativo).

## 9. Sesión del día
- Un ejercicio por pantalla; botones grandes en la mitad inferior (uso con una mano).
- Peso y repeticiones **precargados**; **+/− para peso y para repeticiones**; un toque en "Serie hecha".
- Series marcadas una a una.
- **Contador pasivo** "hace X desde tu última serie": sin alarma ni cuenta atrás; ocultable en ajustes. (ACSM 2026: el descanso entre series no cambia las ganancias de fuerza.)
- Botón **"Molestia"** siempre visible (sección 10).
- Acciones: **Hacer después** (pasa al final), **Sustituir** (2–3 alternativas: mismo patrón y grupo, equipo disponible, no excluidas), **Saltar** (registrado, no penaliza). Deterministas, sin IA. Cada ejercicio tiene su propio historial.
- Conectividad: cada serie se guarda primero en el dispositivo y se envía al reconectar; indicador "pendiente de sincronizar".

## 10. Reglas de progresión (deterministas; la IA nunca toca cargas)
- **Doble progresión:** dentro del rango se suben primero repeticiones. Cuando todas las series llegan al techo del rango en **dos sesiones consecutivas**, la siguiente sesión precarga el **siguiente incremento** de carga y vuelve al suelo del rango. Implementa la regla ACSM 2009 (subir al superar el objetivo en 1–2 repeticiones); ACSM 2026 no fija el incremento.
- **Incremento** = salto real de la máquina (por defecto según tipo de equipo, editable por el usuario).
- No llega al suelo del rango → repite carga. Falla dos sesiones seguidas → baja un incremento **[propuesta]**.
- Series saltadas no cuentan.
- **Molestia:** se para ese ejercicio hoy, sin subida, ejercicio marcado. Si se repite en la siguiente sesión → recomendación de consultar a un profesional y oferta de añadir la zona a limitaciones.
- Sin periodización (ACSM 2026: no superior con progresión adecuada).

## 11. Check-in semanal (premium)
- Entradas: sensaciones, molestias de la semana, actividades externas registradas.
- La IA **solo** puede ajustar: volumen dentro de los suelos/techos del foco y elección de ejercicios dentro del catálogo y las exclusiones. **Nunca cargas.**
- Salida JSON validada contra esquema; el usuario ve el cambio explicado ("esta semana sumaste 3 h de pádel; mantengo el volumen de pierna").

## 12. Actividades externas
Registro con un toque desde inicio: tipo (catálogo), duración, esfuerzo percibido 1–10. En el MVP solo informan al check-in; la recalibración automática diaria es fase 2 (ACSM 2026: datos insuficientes sobre el efecto del entreno concurrente).

## 13. Salud, seguridad y RGPD
- Disclaimer en bienvenida, pantalla del plan y términos. Un descargo no exime por sí solo; para producto real, revisión legal **[pendiente]**.
- Consentimiento explícito antes de cualquier dato de salud (pantalla 7).
- **Cribado:** 7 preguntas con los temas del PAR-Q+ (problema cardíaco o tensión alta diagnosticada; dolor torácico; mareos o pérdida de conocimiento; otra condición crónica diagnosticada; medicación prescrita para condición crónica; problema óseo/articular/de tejidos blandos que empeora con la actividad; indicación médica de actividad solo supervisada) + embarazo.
  - Cualquier "sí" **bloquea** la generación y recomienda consultar a un profesional, **excepto** la pregunta articular, que obliga a marcar la zona en limitaciones.
  - **[pendiente]** cotejar la redacción con el documento oficial PAR-Q+ 2023. Copyright del PAR-Q+: riesgo conocido, aceptado para la demo.
- Limitaciones sin texto libre; exclusión por etiquetas de articulaciones (determinista).
- Fotos nunca almacenadas (sección 6).
- **Ninguna respuesta de salud entra en la analítica.**
- Solo mayores de 18 años.

## 14. Freemium y precio

| | Gratis | Premium **[hipótesis: 5 €/mes]** |
|---|---|---|
| Onboarding, plan inicial IA, calibración | 1 plan | Regenerar plan |
| Registro de sesiones, historial, hacer después/sustituir/saltar | ✓ | ✓ |
| **Sugerencia de carga diaria** (doble progresión) | — | ✓ |
| Check-in semanal → ajuste IA | — | ✓ |
| Gráficas de progreso | Básica | Completas |
| Foto de máquina | **[pendiente]** | **[pendiente]** |

- Prueba premium de 14 días desde el registro **[hipótesis]**.
- Stripe en modo test: Checkout → webhook → `subscription_status` en Supabase → acceso inmediato; error claro si falla. Solo mensual en el MVP.
- **Referencias de mercado** (precios EE. UU., App Store, en USD; no son precios en España):

| App | Tipo | Precio |
|---|---|---|
| Hevy Pro | Registro | 2,99 $/mes · 23,99 $/año |
| Strong PRO | Registro | 4,99 $/mes · 29,99 $/año |
| SensAI | Coach IA | 6,99 $/mes · 69,99 $/año |
| Fitbod | Generador adaptativo | 15,99 $/mes · 95,99 $/año |

  BUDDY ofrece más que un registro (plan IA, progresión, check-in) y menos que Fitbod en madurez; 5 € queda en la franja baja, coherente con "algo pequeño". Sin validar con usuarios.

## 15. Emails (Resend)
1. **Bienvenida** al registrarse.
2. **Confirmación de compra**, con el nombre del producto en el asunto y enlace a la app.
3. **Inactividad**: más de 14 días sin registrar sesión (cron diario).

Limitación MVP: sin dominio propio, Resend solo envía a la dirección de Pablo (D7).

## 16. Panel de admin
Acceso por rol admin (RLS).
- **Solicitudes de máquinas** no reconocidas (descripción en texto) → alta en catálogo.
- **Catálogo:** alta y edición de tipos de equipo y ejercicios con sus etiquetas.
- **Usuarios** y estado de suscripción.
- **Uso de IA:** llamadas por usuario y tipo, coste aproximado.
- **Métricas de producto:** embudo del wizard por pantalla (dónde se va la gente), planes generados, sesiones/semana, duración media, uso de sustituir/saltar/molestia, conversión prueba → premium, errores de IA, fallos de pago, sincronizaciones pendientes.

Eventos en tabla propia de Supabase (datos en la UE, sin terceros), vinculados a usuario, **sin contenido de salud**.

## 17. Métricas de la demo
Tasa de finalización del wizard y pantalla de mayor abandono; sesiones registradas por usuario y semana; conversión de prueba a premium (en test).

## 18. IA
- Claude vía API de Anthropic (Console), solo desde rutas de servidor (D8).
- Usos: generación del plan inicial, check-in semanal, clasificación de fotos.
- **[pendiente]** modelo concreto por uso (Sonnet 5.5 o Haiku 5.5): se decide en el build midiendo calidad y coste por llamada.

## 19. Pendientes y riesgos
- Modelo de IA por uso (sección 18).
- Foto de máquina: gratis/premium y límite.
- Prueba de 14 días y precio: hipótesis.
- Redacción del cribado frente al PAR-Q+ oficial.
- Política de retención de la API de Anthropic para las fotos.
- Re-estimación del build tras el plan de Compound Engineering.
- Riesgo de alcance: si hay que recortar, el orden de construcción deja la foto de máquina al final.

## Fuentes
- Currier et al. (2026), ACSM Position Stand, *Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews*, MSSE 58(4):851–872, doi:10.1249/MSS.0000000000003897 ([PDF](https://www.fisiologiadelejercicio.com/wp-content/uploads/2026/03/Resistance-Training-Prescription-for-Muscl.pdf)).
- ACSM (2009), *Progression Models in Resistance Training for Healthy Adults* ([PDF](https://sfu.ca/~ryand/kin343/ACSMresistance.pdf)).
- Warburton et al., PAR-Q+ y ePARmed-X+ ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3596208)); 2023 PAR-Q+ ([HFJC](https://hfjc.library.ubc.ca/index.php/HFJC/article/view/839)).
- Barakat et al. (2020), *Body Recomposition*, Strength and Conditioning Journal 42(5):7–21 ([registro](https://lida.sport-iat.de/ta/Record/4066252?lng=en)).
- Precios: [SensAI — comparativa 2026](https://www.sensai.fit/blog/fitness-app-pricing-free-tier-comparison); [Hevy — App Store](https://apppricinglab.com/iap/apple/1458862350); [Strong — App Store](https://apps.apple.com/app/id464254577); [Fitbod — reseña 2026](https://www.sensai.fit/blog/fitbod-review-2026). La comparativa de SensAI es de un competidor: tómese como referencia, no como fuente neutral.
