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
| D26 | 28/10 | Supabase con claves publishable/secret, no `anon`/`service_role` | Las legacy dejan de funcionar a finales de 2026; las nuevas se rotan sin caída y la secreta se rechaza desde navegador ([Supabase — migrating to new API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)) |
| — | 19/10 | Copyright del PAR-Q+: riesgo conocido, aceptado para la demo | Se revisa si el producto evoluciona (`TODOS.md`) |

Revisión CEO del PRD (28/10, `04-revision-ceo-prd-v1.md`; las respuestas de esa revisión se citan allí como CEO-D1…D17):

| # | Fecha | Decisión | Motivo |
|---|---|---|---|
| D27 | 28/10 | Foto de máquina y solicitudes de máquinas al admin, aplazadas a después de la entrega (sustituye a D14 en el MVP) | La integración más cara, con pendientes abiertos; los presets cubren la demo |
| D28 | 28/10 | Cola local (D16) con contrato: IDs de serie y sesión generados en el móvil, restricción única, precarga con pendientes y el servidor manda al sincronizar | Evita que duplicados o sesiones sin enviar falseen la progresión |
| D29 | 28/10 | Ningún dato de salud en los prompts de IA (lista cerrada de campos con test); el consentimiento nombra a Anthropic como encargado | Mínimo dato (RGPD): la exclusión ya es determinista |
| D30 | 28/10 | Molestias y bloqueos del cribado solo como contador diario en el servidor, sin `user_id` (complementa D15) | El PRD contradecía el guardarraíl "ningún dato de salud en analítica" |
| D31 | 28/10 | La sugerencia de carga diaria pasa a ser gratis; premium = funciones con IA (sustituye a D4) | La promesa central (§3) para todos; las reglas no cuestan nada, la IA sí |
| D32 | 28/10 | Premium con 5 funciones de IA: coach que explica, detector de estancamiento, semana adaptada, sesión exprés y pregúntale a BUDDY (PRD §11) | Diferencial frente a Hevy/Strong dentro de los guardarraíles; < 1 $/usuario/mes estimado |
| D33 | 28/10 | Entrega el viernes 6/11/2026; orden de build con línea de corte "demo completa" (PRD §20) | ~30 h para todo el MVP: el núcleo llega siempre |
| D34 | 28/10 | Se mantiene la confirmación por email; sin dominio solo llega a Pablo (D7). Dominio propio: requisito para producción (`TODOS.md`) | Producto que parezca profesional y multiusuario |
| D35 | 28/10 | Refiltrado determinista y gratis del plan al cambiar limitaciones o equipo | Garantiza el guardarraíl 6 también en el plan gratis |
| D36 | 28/10 | Se mantiene la prueba premium de 14 días; "es premium" sale de una única función (reloj + `subscription_status`) | Palanca de conversión, con una sola fuente de verdad en código |
| D37 | 28/10 | Bloqueantes legales para producción (PAR-Q+, revisión legal, DPA con Anthropic) en `TODOS.md` | No son código y bloquean el lanzamiento |

Fase 2, diseño (12/11, `docs/diseno/`):

| # | Fecha | Decisión | Motivo |
|---|---|---|---|
| D38 | 12/11 | La entrega pasa al viernes 20/11/2026 (sustituye la fecha de D33; la línea de corte se mantiene) | Decisión de Pablo |
| D39 | 12/11 | Confirmado D32: premium incluye la 4 (sesión exprés) y la 5 (pregúntale a BUDDY), las dos tras la línea de corte | Cierra la interpretación pendiente de "4 / 5 también" |
| D40 | 12/11 | Gráficas: básica gratis = peso de trabajo por ejercicio (8 semanas); completas premium = historial completo, series por grupo frente al objetivo, constancia y mejores series | Cierra el [pendiente] de PRD §14 |
| D41 | 12/11 | Check-in: el usuario ve el ajuste del coach y elige aplicarlo o mantener su plan; no se aplica solo | Control del usuario; encaja con "el coach explica" |
| D42 | 12/11 | Dirección visual "Venice 89 × arcade": limón y morado, tema claro L3 (marcador + papel + trama) y oscuro con selector; Archivo Expanded en títulos y números, Atkinson Hyperlegible Next en cuerpo, Press Start 2P en celebraciones; esquinas duras | Identidad propia, legible con la luz del gimnasio y sin aspecto de app genérica |
| D43 | 12/11 | Usuario gratis: un cambio de foco o de días al mes, que regenera el plan con IA; premium, sin ese límite (dentro del tope general). Completa D35, que solo cubría limitaciones y equipo | Cambiar de días cambia la plantilla y no es un refiltrado; sin esto el gratis quedaba atrapado (revisión de diseño, D26) |
| D44 | 12/11 | La IA no recibe nada de lo que se pueda deducir la salud: catálogo filtrado solo por equipo y sin molestias; limitaciones y molestias se aplican después con el refiltrado (corrige PRD §7 y §11) | Un catálogo recortado por limitaciones revela la limitación; guardarraíl 8 / D29 (revisión del plan) |
| D45 | 12/11 | El mínimo de 2 veces por semana por grupo solo se exige a grupos con algún ejercicio posible; si no hay ninguno, hueco con aviso | Si no, una limitación dejaría al usuario sin plan; prima el guardarraíl 6 (revisión del plan) |
| D46 | 18/11 | Confirmación de email con la plantilla por defecto de Supabase: el enlace vuelve a `/auth/confirm` con `code`; si se abre en otro navegador, el email ya está confirmado y se pide entrar. Se conserva el camino `token_hash` para cuando haya SMTP propio | Sin SMTP propio Supabase no deja editar la plantilla, y usar Resend como SMTP sin dominio solo enviaría a Pablo y bloquearía a los testers (D7, D34). Aceptado por Pablo (opción A) |
| D47 | 18/11 | Registro con un email que ya existe: misma respuesta que un registro nuevo ("revisa tu correo"), no el "Ese email ya tiene cuenta" del diseño D13 | Evita que se pueda averiguar quién tiene cuenta (KTD15); con la confirmación activa, Supabase tampoco lo revela |
| D48 | 18/11 | Eventos del embudo antes del registro: se guardan en el borrador del dispositivo y se vuelcan a `events` al registrarse; el abandono anónimo no se registra. Del cribado solo se registra la vista del paso "seguridad" | `events` exige `user_id`; ninguna fila puede revelar el resultado del cribado (KTD14, D30) |
| D49 | 18/11 | Foco con "Equilibrado" preseleccionado; el resto del wizard sin respuestas por defecto | Lo dice el PRD §5, que manda sobre el plan; D6 y D13 solo cubren cribado y experiencia |
| D50 | 18/11 | Salida sin consentimiento (diseño D14): al volver a entrar se abre el consentimiento, con el enlace a la salida a un toque, en vez de recordar que el usuario estaba en la salida | No hay dónde guardarlo sin añadir estado nuevo; el resultado para el usuario es el mismo |
| D51 | 18/11 | Bloqueo del cribado: se muestra en la misma pantalla, sin cambiar de URL; si había un cribado superado, se borra | El resultado no queda en rutas, historial ni logs (KTD17); un «Sí» de riesgo debe bloquear la generación (guardarraíl 5) |
| D53 | 18/11 | Plan inicial: la IA solo elige el ejercicio de cada hueco; las series las calcula el código según minutos (≈2,5 min por serie, 2 a 4 por ejercicio, 5 en Más músculo; principal de Más fuerza 2–3) y foco; títulos y etiquetas los monta el código; el cardio opcional de Perder grasa lo añade el código, no la IA | Guardarraíles 3 y 4 (volumen en código) y D17 de diseño (nunca texto libre de la IA). Contrastado con los agentes de producto y guardarraíles |
| D54 | 18/11 | Reserva del límite de IA y guardado del plan en funciones SQL transaccionales con bloqueo por usuario (`reserve_ai_call`, `save_plan`, solo service_role); el límite solo se consume si el plan queda guardado | Dos peticiones a la vez no pueden pasar las dos (KTD18, probado contra staging) y no quedan planes a medias. Propuesta del agente de guardarraíles |
| D55 | 18/11 | Los huecos sin ningún ejercicio posible con el equipo no se piden a la IA y quedan vacíos con motivo; si una limitación vacía un hueco o deja un grupo posible por debajo de 2 sesiones, el código lo rellena o repara con un ejercicio de la misma región que no carga la zona; se permite repetir ejercicio en la sesión solo si no queda otro de esa región | La evaluación mostró fallos imposibles de arreglar por la IA (no ve limitaciones, KTD19): "solo peso libre" no tiene tracción vertical y "rodilla" dejaba glúteos sin cubrir. Tras el cambio, 10/10 válidos |
| D56 | 18/11 | El equipo de `gym_profiles` se interseca con el catálogo y se deduplica en el servidor antes de usarlo | El usuario puede escribir esa tabla directamente por la API (revisión de código) |
| D57 | 18/11 | Modelo del plan inicial: Sonnet 5.5. Evaluación de 10 perfiles (`docs/eval-plan.md`): Sonnet y Haiku 10/10 válidos; 0,010 $ frente a 0,001 $ por plan | Con la misma validez, el céntimo de diferencia no pesa en la demo y el plan inicial es el primer momento de valor; Haiku queda medido como alternativa si el volumen crece |
| D58 | 18/11 | Letra pixelada: Silkscreen en lugar de Press Start 2P (DESIGN.md §3). Se puede revertir en una línea (`src/app/layout.tsx`) | Press Start 2P dibuja Í, Ó, Á, É, Ú y Ñ a altura de minúscula ("SESIóN", "DíAS"): una errata en la marca en una app en español. Comparativa en `docs/diseno/auditoria-2026-11-18/fuentes-pixel.png`; Silkscreen es la más cercana al bloque arcade. Auditoría de diseño del 18/11, confirmada por Pablo con la comparativa delante (frente a Tiny5 y Pixelify Sans) |
| D52 | 18/11 | Sesión autónoma de 3 h: Pablo delega las decisiones a Claude, incluido el paso a `main` y las migraciones en prod tras probarlas en staging; Claude las contrasta con dos agentes (guardarraíles/RGPD y producto/diseño) y las registra aquí | Autorizado por Pablo en la sesión del 18/11 |
| D59 | 18/11 | Elevación 2026 con la dirección B, "Revista de Venice": cifra de portada en el marcador de las pantallas de la app, marcador en dos alturas, filas numeradas, tira de la semana y el arcade concentrado en los logros (DESIGN.md §1 y §4) | Resuelve el mayor defecto de la auditoría (Hoy, Plan y Progreso sin protagonista) y se apoya en decisiones ya tomadas (§4 bis y D17 de diseño). A (HUD) podía infantilizar; C (oscuro primero) perdía el papel crema. Elegida por Pablo con las maquetas delante (`docs/diseno/auditoria-2026-11-18/maquetas-decisiones.html`) |
| D60 | 18/11 | Pestaña activa de la barra inferior: celda entera en limón, texto e icono en tinta y filete superior de tinta (DESIGN.md §5) | La barra limón sobre crema incumplía la regla dura de §2 (1,3:1); es el mismo patrón que el menú lateral. Elegida por Pablo |
| D61 | 18/11 | Tema oscuro: claro por defecto; el oscuro llega como interruptor en Ajustes (U11), después de la línea de corte | Coste cero ahora y los tokens ya existen. A Pablo le gustó la dirección C ("Muscle Beach de noche"): sus detalles se valoran al construir el oscuro |
| D62 | 18/11 | Hoy en escritorio en 2 columnas: sesión y CTA (420 px como máximo) a la izquierda; cifras de portada y semana en una columna de 360 px a la derecha | Concreta D24 de diseño con la dirección B y elimina las filas y el CTA de 1000 px. Elegida por Pablo |
| D63 | 18/11 | U7: una sola ruta `/sesion/[id]` para calibrar y entrenar. Se calibra cada ejercicio sin carga fijada, también los que entran luego por refiltrado o "Cambiar ejercicio". Al fijar el peso se pasa al siguiente ejercicio, sin series de trabajo ese día. Objetivo de calibración = mitad del rango de repeticiones; "No llegué" se guarda como una repetición menos que el objetivo | `plan.md` preveía `/calibracion/[id]` aparte. Con una sola ruta, un ejercicio nuevo nunca se queda sin calibrar, y la interfaz de calibración sigue siendo propia (PRD §8). Contrastado con los agentes de guardarraíles y de producto |
| D64 | 18/11 | Integridad de la sesión: una sola sesión abierta por usuario (índice único; una abierta hace más de 12 h se cierra sola). Una fila por serie (`session_id`, `exercise_id`, `set_index`). El usuario solo puede actualizar `ended_at` de su sesión. El servidor solo acepta ejercicios del día o sus alternativas permitidas y fija la carga de calibración. El RIR se puede corregir | Revisión de guardarraíles: dobles toques con IDs distintos, sesiones duplicadas, un cliente manipulado que registra un ejercicio excluido (guardarraíl 6) y columnas de la sesión editables. Probado contra staging (RLS) |
| D65 | 18/11 | Molestia: siempre deja en `set_logs` una fila neutra "detenida", sin motivo ni zona, y suma al contador diario sin `user_id`. La marca de Molestia (dato de salud) solo se guarda con consentimiento vigente. La carga de trabajo pasa a ser la más repetida entre las series hechas y no cambia si hubo Molestia. "Añadir y ajustar mi plan" tiene acción propia: une zonas del ejercicio y refiltra, sin tocar el cribado | Sin la fila neutra, una Molestia sin consentimiento (o borrada al retirarlo) dejaría subir carga en la sesión siguiente (guardarraíl 7). "La última serie" hundía la carga si se bajaba peso al final. Revisión de guardarraíles |
| D66 | 18/11 | Dirección B en la sesión: sin cifra de portada, porque los números grandes son el peso y las repeticiones. El fin de sesión es la única portada de logro (ejercicios y series). En calibración, banda morada con etiqueta turquesa (el magenta de "Tengo molestia" sobre turquesa daba 1,8:1). Hoy no estima minutos en calibración. Progreso: la mayor subida real. Ajustes y wizard: marcador interior. Botonera de 3 botones y título de hasta 2 líneas. El aviso con Deshacer va en el pie y dura 5 s | Revisión de producto y capturas a 360×640: D22 se cumple (peso, repeticiones, +/− y "Serie hecha" sin scroll). Sin cifra la zona de datos queda limpia (DESIGN.md §1) y con 2 líneas se lee el nombre entero del ejercicio |
| D67 | 18/11 | Tira de la semana: una casilla por sesión del plan, numeradas (1, 2, 3), en vez de días de la semana | El plan no asigna días de la semana, así que pintar L–D inventaría un dato |
| D68 | 18/11 | Ninguna sesión vacía: si las limitaciones o el equipo dejan un día con menos de la mitad de sus huecos, se rehace con ejercicios posibles de cualquier región (sin pasar el techo de 20 series y haciendo sitio si hace falta). El día rehecho se llama "Cuerpo completo". Nunca se abre una sesión sin ejercicios | En staging, con el hombro limitado, los días de torso salían vacíos ("0 de 0"). Elegido por Pablo entre rehacer el día, solo revisar el catálogo o unir días |
| D69 | 18/11 | Ajustes (U11: gimnasio, limitaciones, foco y días, preferencias y privacidad) se construye antes del coach (U8) | Sin Ajustes, Pablo no podía usar la app para probarla (no podía cambiar sus máquinas ni sus limitaciones). Decidido por Pablo |
| D70 | 18/11 | Catálogo mucho más grande (brazo, core, variantes de máquina), igual en staging y prod por migración. Cada ejercicio lleva técnica. Nueva regla de "contribución leve": además de `joints` (zona cargada, excluye), un ejercicio puede tener `joints_light`; si la limitación del usuario solo coincide ahí, no se excluye, pero la sesión muestra un aviso sobrio y la clave de técnica | Petición de Pablo: un catálogo corto deja planes pobres y excluir todo lo que roza una zona quita opciones razonables (por ejemplo, una sentadilla controlada). Criterio conservador: ante la duda, `joints`. Revisión previa en `docs/catalogo-revision-2026-11-18.md` |
| D71 | 18/11 | Al retirar el consentimiento se borran también los check-ins (escalas de sensación y fatiga), además del perfil de salud y las marcas de Molestia | Decidido por Pablo: se tratan como datos de salud por prudencia (RGPD) |
| D72 | 18/11 | En Ajustes se pueden dejar vacías las limitaciones aunque en el cribado se respondiera "Sí" a la pregunta articular | Decidido por Pablo. Las respuestas del cribado no se guardan (D51) y el usuario es quien mejor sabe si su zona ya no le limita |
| D73 | 18/11 | Sesión que enseña: dibujo propio (maniquí SVG con flecha del movimiento, uno por patrón) y técnica entera en la pantalla de paso, también antes del primer ejercicio; "Cómo se hace" durante las series; lista de series que se toca para corregir (D8); calibración en dos tiempos (serie hecha, luego repeticiones reales y reserva) | Pablo, al probar staging, no sabía qué ejercicio hacer ni cómo, ni veía sus series. Sin fotos ni recursos de terceros. Se mantiene la regla de 360×640 (comprobada por el banco de pruebas) |
| D74 | 18/11 | Dibujos de técnica reales: ilustraciones de Everkinetic (CC BY-SA 4.0) adaptadas (solo el trazo, pintado con los colores del tema), dos fotogramas por ejercicio ("1 · Empiezas" en papel, "2 · Llegas y vuelves" en celda limón, flecha morada). Crédito y licencia bajo cada dibujo y en `public/ejercicios/LEEME.md`. 104 de 117 ejercicios con dibujo (33 de una variante parecida, marcados); 13 sin dibujo, solo texto. Sustituye el maniquí propio de D73 | Pablo: los maniquíes parecían de niño y la prensa parecía una sentadilla. Ilustración libre y verificable en lugar de crearla desde cero: calidad de dibujante y licencia que permite adaptarla con atribución. Los dibujos adaptados quedan bajo CC BY-SA 4.0; el código no se ve afectado |

## 4. Abierto
- Modelo de IA por uso: Sonnet 5.5 o Haiku 5.5 (se mide en el build).
- Redacción del cribado frente al PAR-Q+ oficial.
- Límite de generaciones de IA por usuario (cifra, en `plan.md`).
- Contenido de las gráficas básica y completas (diseño).
- Verificar: límite de duración de funciones en Vercel Hobby y crons en previews.
