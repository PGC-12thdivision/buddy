# 04 — Revisión CEO del PRD v1 (/plan-ceo-review)

> Fecha: 28/10/2026 · Rama: `staging` · Revisado: `docs/02-prd-v1.md`.
> Documento de trabajo de la revisión. Las propuestas marcadas **pendiente** no están aprobadas; el PRD no cambia hasta que Pablo lo decida.
> Herramientas: `bun` no está instalado, así que la caché de contexto de gstack y `gstack-plan-reality` no se ejecutaron. Las comprobaciones de realidad se hicieron a mano (abajo). Aside no está instalado; la búsqueda se hizo con WebSearch.

## Paso 0 — Contexto

### Auditoría del sistema
- Repo: solo esqueleto (`src/app/{layout,page}.tsx`, `src/components/ui/button.tsx`, `src/lib/utils.ts`, `supabase/config.toml`). Sin migraciones, sin `plan.md`, sin `TODOS.md`, sin documento de diseño.
- `staging` va 4 archivos de docs por delante de `main` (`.env.example`, `CLAUDE.md`, `docs/01`, `docs/03`). Sin stashes. Sin TODO/FIXME en el código.
- Sin revisiones previas ni reverts: no hay retrospectiva que aplicar.
- Alcance de UI: sí (wizard, sesión del día, admin). La sección 11 aplica.

### Paisaje (WebSearch, 28/10/2026)
- **Capa 1 (lo probado):** Fitbod (sobrecarga progresiva automática con datos de la app), Hevy/Strong (registro puro). La progresión automática es lo esperable en la categoría, no un diferencial.
- **Capa 2 (lo que se dice):** muchos planificadores IA de 2026 (BodyPlan, dynaimic, Fit AI, Forge, Kaizer) prometen "ajuste semanal adaptativo". Una guía señala que la mayoría construye el plan con un cuestionario de 5 preguntas y nunca lo actualiza de verdad. La retirada más fuerte en apps de salud se da en las **dos primeras semanas** (mediana del 70 % de abandono en 100 días; fuente secundaria). Lo que hace el usuario en los primeros 7 días predice mejor la retención a 90 días que cualquier señal posterior (opinión de un profesional del sector, no es un estudio).
- **Capa 3 (primeros principios):** el diferencial de BUDDY no es "IA que hace planes" (eso es ya commodity), sino **la combinación de catálogo cerrado del gimnasio real + guardarraíles deterministas + calibración**: un plan que no te pone una máquina que no existe ni un ejercicio que te carga la rodilla. Eso es verificable y demostrable en un Loom; el "ajuste adaptativo IA" lo prometen todos.

Fuentes: [rapidnative — AI fitness apps 2026](https://www.rapidnative.com/blogs/ai-fitness-apps), [Lindy — workout planner app](https://wf.lindy.ai/blog/workout-planner-app), [dynaimic](https://mwm.ai/apps/dynaimic-ai-workout-planner/6761840180), [Sahha — health app churn](https://sahha.ai/blog/health-app-churn-retention/), [Survival analysis for fitness app churn](https://mhealth.amegroups.org/article/view/144969/html).

### 0A. Desafío de la premisa
- **Problema real (usuario):** "no sé qué hacer en el gimnasio ni cuándo subir peso". El PRD lo ataca directamente con plantilla + catálogo + calibración + doble progresión. Bien.
- **Problema real (entrega):** el criterio mínimo es "app desplegada, backend real, una integración de punta a punta, algo pequeño que funcione entero" (`01` §2.A). El listón de Retos 1–9 añade Stripe, 3 emails, staging/prod y documentación. El PRD v1 va bastante más allá: foto con visión, panel de admin con 11 métricas, guardado local con sincronización y actividades externas. `02` §4 nota y `03` ya reconocen que la estimación de 3–5 jornadas no vale.
- **Coste de no hacer nada:** no hay certificado. Coste de hacerlo todo: el riesgo es entregar 12 piezas a medias en lugar de 8 enteras, que es justo lo que contradice "algo pequeño que funcione entero".
- **Hallazgo 1 (premisa, pendiente):** la propuesta de valor (§3) es "una sala de máquinas que te dice cada día qué peso toca", pero la sugerencia de carga diaria es **premium** (§14). Un usuario gratis tras la prueba recibe el plan y un registro, que es lo que ya hacen gratis Hevy y Strong. O la prueba de 14 días cubre justo la ventana de abandono (y entonces es la pieza clave del embudo, no una hipótesis secundaria), o la promesa central está tras el muro de pago.
- **Hallazgo 2 (premisa, pendiente):** el email de inactividad salta a los 14 días, cuando la mayor parte del abandono ya ha ocurrido, y sin dominio propio solo llega a Pablo (D7). Es un requisito de Reto 6, no una palanca de retención. Correcto como casilla de entrega; no debe venderse como retención.

### 0B. Aprovechar lo existente
| Subproblema | Reutilizable | Nota |
|---|---|---|
| Doble progresión, registro de series | Artefacto "Sala de Máquinas" (lógica validada con uso real, `01` §1) | D2 decide reconstruir; la lógica sí se puede portar como especificación y oráculo de tests de las funciones puras |
| Auth, RLS | Supabase Auth + plantillas RLS | Sin código propio que reutilizar todavía |
| UI | shadcn/ui ya instalado (`button.tsx`) | |
| Pagos, emails | Stripe Checkout, Resend | Integraciones estándar |

Nada se reconstruye que ya exista en el repo: solo hay esqueleto.

### Comprobaciones de realidad (manuales; `gstack-plan-reality` no disponible)
- REALITY: premise-table finding unverified=3 (precio 5 €, prueba 14 días, retención de fotos en la API de Anthropic) `docs/02-prd-v1.md:189`
- REALITY: already-done pass nada del PRD está construido; solo el esqueleto de fase 0 `src/app/page.tsx:1`
- REALITY: surface-check pass la superficie (Next 16, Supabase, Stripe, Resend, Anthropic) coincide con el stack `docs/03-stack-y-logistica.md:3`
- REALITY: binding-decisions finding D9 (check-in en MVP) y D14/D15/D16 (foto, admin, guardado local) fijan alcance que esta revisión puede cuestionar solo con aprobación `docs/01-contexto-y-criterios.md:47`
- REALITY: numbers finding la estimación de 3–5 jornadas está invalidada y no hay otra `docs/02-prd-v1.md:33`
- REALITY: deferred-asks pass no hay issues vinculadas `docs/02-prd-v1.md:189`
- REALITY: pr-count pass 2 PRs mergeados, ninguno abierto `CLAUDE.md:1`

### 0C. Estado ideal
```
  ESTADO ACTUAL                    ESTE PLAN (PRD v1)                    IDEAL A 12 MESES
  Esqueleto + PRD v1     --->      12 módulos MVP, incluidos     --->     Producto real: gimnasios
  (fase 0 cerrada)                 foto IA, admin con 11                   con catálogo verificado,
                                   métricas, guardado local                retención semana 1–4 medida,
                                                                           precio validado, dominio
                                                                           propio y emails reales
```
El PRD avanza hacia el ideal en el núcleo (catálogo, reglas, calibración). Las piezas periféricas (foto, analítica completa) avanzan hacia él solo si el núcleo está entero; si no, son coste sin retorno.

## Registro de decisiones de la revisión

| ID y responsable | Contrato y evidencia | Actual | Propuesto | Estado | Aprobación exacta y alcance |
|---|---|---|---|---|---|
| R0-office-hours (Pablo) | No hay doc de diseño | — | Saltar /office-hours | approved | D1: "Saltar, revisar ya" |
| R0-learnings (Pablo) | Config de gstack | unset | entre proyectos | approved | D2: "Entre proyectos" |
| R0-mode (Pablo) | Paso 0E | — | SCOPE REDUCTION | approved | D3: "me inclino hacia 1 siempre y cuando después de la entrega podamos explorar el hacer el producto más grande y poder llevarlo a una producción real". Alcance: modo de revisión. Condición: lo recortado se **aplaza** (TODOS.md con contexto), no se descarta, y el diseño no debe cerrar el crecimiento posterior |
| S1-foto (Pablo) | PRD §6, D14, §19 último del orden | En MVP | Aplazar a TODOS.md | approved (deferred) | D4: "Aplazar a TODOS.md". Alcance: foto de máquina y solicitudes de máquinas al admin, fuera del MVP; se retoman tras la entrega (R0-mode) |
| S2-offline (Pablo) | PRD §9 conectividad, D16 | Cola local + envío al reconectar | Aplazar la cola; mantener guardado por serie con reintento y error visible + clave idempotente por serie | declined (kept) | D5: "Mantener la cola en el MVP". Alcance: la cola local con envío al reconectar sigue en el MVP tal como dice D16 |
| S3-admin (Pablo) | PRD §16, D15, CLAUDE.md guardarraíl 12 | 5 bloques + 11 métricas | Mantener uso de IA, usuarios/suscripción y las 3 métricas de §17; aplazar CRUD de catálogo (va por migraciones semilla), solicitudes de máquinas y resto de métricas | declined (kept) | D6: "Mantener el panel completo". Alcance: catálogo CRUD, usuarios, uso de IA y las 11 métricas siguen en el MVP. El bloque de solicitudes de máquinas no tiene origen sin la foto (D4) y se aplaza con ella |
| S4-actividades (Pablo) | PRD §12, D19, §11 | Pantalla 5 + registro de un toque + contexto del check-in | Mantener la pantalla 5 como contexto; aplazar el registro diario | declined (kept) | D7: "Mantener el registro". Alcance: pantalla 5 + registro de un toque + contexto del check-in, como en §12 |
| S5-graficas (Pablo) | PRD §14 | Básica (gratis) / Completas (premium) | Una gráfica por ejercicio para todos; aplazar "completas" | declined (kept) | D8: "Mantener básica y completas". Alcance: dos niveles de gráficas; el contenido de cada nivel queda por definir en diseño |
| R1-sync (Pablo; sección 1) | PRD §9 cola local (mantenida en D5), §10 "dos sesiones consecutivas" | Sin clave única por serie; sin regla de qué historial alimenta la precarga | A: clave única por serie generada en el móvil + precarga calculada con historial sincronizado o, si hay pendientes, con esas series incluidas en el móvil | approved | D9: "Contrato completo". Alcance: clave única por serie generada en el móvil con restricción única en BBDD; la precarga usa historial sincronizado + series pendientes locales y, si no puede, avisa "sin sincronizar"; tests unitarios de duplicado y de sesión N pendiente |
| R3-ia-salud (Pablo; sección 3) | CLAUDE.md guardarraíl 8 (mínimo dato); PRD §7, §11, §13 | Sin regla sobre qué datos de salud viajan a la API de Anthropic | A: el plan recibe solo el catálogo ya filtrado; el check-in recibe solo IDs de ejercicios marcados y escalas, sin identificadores; el consentimiento nombra a Anthropic como encargado | approved | D10: "Minimizar + consentimiento". Alcance: el prompt del plan recibe solo el catálogo filtrado (ni limitaciones ni cribado); el del check-in, solo IDs de ejercicios marcados y escalas, sin identificadores; el consentimiento (pantalla 7) nombra a Anthropic como encargado y la transferencia; test unitario de que el prompt no contiene campos de salud |
| R3-molestia (Pablo; sección 3) | PRD §16 métrica "uso de molestia" vinculada a usuario frente a CLAUDE.md guardarraíl 8 y PRD §13 | Contradicción | A: eventos de molestia (y resultado del cribado) sin user_id, solo recuento agregado por día | approved | D11: "Agregado sin usuario". Alcance: eventos de molestia y de cribado bloqueado sin user_id, como recuento agregado por día; la molestia en la serie sigue en la app con RLS; test unitario de que esos eventos no llevan user_id. Modifica §16 |
| R10-valor (Pablo; sección 10) | PRD §3 propuesta de valor frente a §14 (sugerencia de carga = premium); D4; 0A hallazgo 1 | Sugerencia de carga diaria solo premium; prueba de 14 días como hipótesis | B: sugerencia de carga gratis; premium = check-in IA + regenerar plan + gráficas completas | approved | D12: "hagamos la opción recomendada, pero tenemos que aportar mucho más valor en la parte de llamada de la IA [...] hay que ver dónde la IA puede hacer que el entreno propuesto, recomendaciones, cambios de ejercicios... sea realmente diferencial". Alcance: sugerencia de carga gratis para todos; premium = funciones con IA. Reabre D4 (nueva decisión en `01`). Queda abierto: definir qué funciones de IA hacen premium diferencial frente a Hevy/Strong, sin romper guardarraíles 2–4 (fila R10-premium-ia) |
| R10-premium-ia (Pablo + Claude; antes de `plan.md`) | D12 | Premium = check-in + regenerar + gráficas completas | Sesión de ideación de valor IA premium | unresolved (tarea abierta, no es una decisión de esta revisión) | Pedido por Pablo en D12 |

## currentDecision (R10-valor)
Commitment comparison:
```text
Compromiso                 | Fuente  | Actual          | A (premium + prueba firme) | B (carga gratis)          | C (dejar hipótesis)
Sugerencia de carga diaria | §14, D4 | Premium         | Premium                    | Gratis                    | Premium
Prueba 14 días             | §14     | Hipótesis       | Comprometida en el MVP     | Opcional (sobre check-in) | Hipótesis
Gratis tras la prueba      | —       | No definido     | Historial + peso a mano    | Plan + progresión completa | No definido
Premium                    | §14     | 4 ventajas      | 4 ventajas                 | Check-in, regenerar, gráficas completas | 4 ventajas
Coste por usuario gratis   | —       | ~0 tras el plan | ~0                         | ~0 (las reglas no llaman a la IA) | ~0
Cambia D4                  | 01 §3   | —               | No                         | Sí, nueva decisión        | No
```
Question: D12 — R10-valor: ¿La sugerencia diaria de carga es gratis o premium?
Header: Valor
A) Premium + prueba firme
Esfuerzo S, riesgo medio. ✅ Mantiene D4 y una razón fuerte para pagar. ✅ La prueba de 14 días cubre la ventana en la que más gente abandona. ❌ Pasados 14 días, el usuario gratis pierde justo lo que promete el §3.
B) Sugerencia de carga gratis (recommended)
Esfuerzo S, riesgo medio. ✅ La promesa del §3 se cumple para todos, y las reglas no cuestan nada por usuario. ✅ Se cobra lo que sí cuesta dinero: las llamadas a la IA. ❌ Premium queda más flojo; convertir será más difícil.
C) Dejarlo como hipótesis
Esfuerzo S (cero ahora), riesgo medio. ✅ Se decide con datos reales de uso tras la entrega. ✅ No reabre D4 ahora. ❌ Hay que diseñar y construir igualmente qué ve el usuario gratis.

## currentDecision (R3-molestia)
Commitment comparison:
```text
Compromiso                  | Fuente          | Actual                  | A (agregado sin usuario) | B (quitar de métricas) | C (mantener vinculado)
Evento "molestia"           | §16             | Vinculado a usuario     | Recuento diario, sin user_id | No se emite         | Vinculado
Evento "cribado bloqueado"  | §5, §16 embudo  | Implícito en el embudo  | Recuento diario, sin user_id | No se emite         | Vinculado
Molestia en la sesión       | §10             | Guardada en la serie    | Igual (dato de la app, con RLS) | Igual             | Igual
Test                        | —               | —                       | Unit: esos eventos no llevan user_id | Unit: no se emiten | —
```
Question: D11 — R3-molestia: ¿Cómo cuento "molestias" en la analítica sin romper el guardarraíl de salud?
Header: Molestias
A) Agregado sin usuario (recommended)
Esfuerzo S, riesgo bajo. ✅ Conserva la métrica del panel (D6) y cumple el guardarraíl 8. ✅ El dato de la sesión sigue protegido por RLS donde ya hacía falta. ❌ No se puede ver qué usuario concreto marca molestias desde la analítica.
B) Quitar de la analítica
Esfuerzo S, riesgo bajo. ✅ Cero datos de salud en eventos, sin matices. ✅ Es lo más fácil de explicar en el Loom y en los términos. ❌ El panel pierde la señal de qué ejercicios dan problemas.
C) Mantener vinculado al usuario
Esfuerzo S, riesgo alto. ✅ Máximo detalle para analizar el producto. ✅ Es lo que dice hoy el §16. ❌ Contradice CLAUDE.md y el §13: dato de salud en la analítica.

## currentDecision (R3-ia-salud)
Commitment comparison:
```text
Compromiso                         | Fuente        | Actual      | A (minimizar + consentimiento) | B (solo consentimiento) | C (nada)
Limitaciones/cribado al prompt     | §7, §13       | No definido | Nunca; la IA ve el catálogo ya filtrado | Pueden ir         | No definido
Molestias/sensaciones al check-in  | §11           | No definido | IDs de ejercicio + escalas, sin email ni nombre | Tal cual   | No definido
Texto del consentimiento           | §5 pantalla 7 | Finalidad   | + Anthropic como encargado y transferencia | + Anthropic   | Finalidad
Test                               | —             | —           | Unit: el prompt construido no contiene campos de salud | —   | —
```
Question: D10 — R3-ia-salud: ¿Qué datos de salud pueden llegar a la API de Anthropic?
Header: IA y salud
A) Minimizar + consentimiento (recommended)
Esfuerzo S, riesgo bajo. ✅ La exclusión ya es determinista, así que la IA no necesita saber qué te duele. ✅ Un test comprueba que el prompt no lleva campos de salud. ❌ El check-in razona con menos matiz (sin texto libre de sensaciones).
B) Solo actualizar el consentimiento
Esfuerzo S, riesgo medio. ✅ La IA tiene todo el contexto para el check-in. ✅ Cumple la transparencia nombrando al encargado. ❌ Datos de categoría especial salen de la UE sin necesidad.
C) Dejarlo para la revisión de ingeniería
Esfuerzo S (cero ahora), riesgo alto. ✅ Se decide con los prompts escritos. ✅ No cambia el PRD ahora. ❌ Es una decisión de producto y RGPD, no de código; puede quedar sin dueño.

## currentDecision (R1-sync)
Commitment comparison:
```text
Compromiso                     | Fuente     | Actual        | A (contrato completo)              | B (solo clave única)        | C (nada)
Cola local                     | D5         | En MVP        | En MVP                             | En MVP                      | En MVP
Clave única por serie          | —          | No definida   | Sí, restricción única en BBDD      | Sí                          | No
Precarga con pendientes        | §10        | No definida   | Usa historial sincronizado + pendientes locales; si no puede, avisa "sin sincronizar" | Solo historial del servidor | No definida
Test                           | CLAUDE.md  | Vitest cargas | Unit: duplicado y sesión N pendiente | Unit: duplicado            | —
```
Question: D9 — R1-sync: ¿Cómo garantizo que la cola local no falsee la progresión?
Header: Sync
A) Contrato completo (recommended)
Esfuerzo M, riesgo bajo. ✅ Ninguna serie se cuenta dos veces: la BBDD rechaza el duplicado. ✅ La precarga nunca sale de un historial a medias; si no puede, lo dice. ❌ La regla de progresión también corre en el móvil, con los mismos tests.
B) Solo clave única
Esfuerzo S, riesgo medio. ✅ Elimina los duplicados con una restricción en BBDD. ✅ La progresión vive solo en el servidor, más simple. ❌ Si la sesión anterior no sincronizó, la precarga puede quedarse un incremento corta.
C) No definirlo ahora
Esfuerzo S (cero ahora), riesgo alto. ✅ Lo decide la revisión de ingeniería con el código delante. ✅ No añade nada al PRD. ❌ Riesgo de que la progresión, el corazón del producto, falle en silencio.

**Resultado del 0G:** se aplaza solo S1 (foto + solicitudes de máquinas). S2–S5 se mantienen por decisión de Pablo. El alcance efectivo es el PRD v1 menos la foto: prácticamente HOLD SCOPE. Las secciones de revisión endurecen ese alcance; no vuelven a proponer recortes ya contestados.

## 0G. Núcleo mínimo propuesto (pendiente de cada decisión)
Se mantiene sin pregunta, porque es el núcleo o ya está decidido: wizard + registro + consentimiento + limitaciones + cribado; catálogo semilla; plan (plantilla + IA + zod + topes); calibración; sesión del día con hacer después/sustituir/saltar/molestia; doble progresión con tests; check-in semanal (D9); Stripe test; 3 emails; registro de llamadas IA; staging + prod.

Propuestas de aplazamiento: S1–S5 (abajo, una pregunta por fila).

## currentDecision (S1-foto)
Commitment comparison:
```text
Compromiso              | Fuente            | Actual    | A (aplazar)                 | B (mantener)
Ruta de visión          | PRD §6, D14       | En MVP    | Fase post-entrega, TODOS.md | En MVP, último en build
Solicitudes al admin    | PRD §16           | En MVP    | Aplazadas con la foto       | En MVP
Pendientes §6.6–6.7     | PRD §19           | Abiertos  | Se resuelven al retomarla   | Hay que resolverlos antes
Alta de máquinas        | PRD §6            | Foto+preset | Presets + desmarcar        | Presets + foto
```
Question: D4 — S1-foto: ¿Aplazo la foto de máquina a después de la entrega?
Header: Foto
A) Aplazar a TODOS.md (recommended)
Esfuerzo S (cero implementación ahora), riesgo bajo. ✅ Quita la integración más cara y con dos pendientes sin resolver (retención de la API, gratis/premium). ✅ El catálogo semilla con las máquinas de tu gimnasio ya cubre la demo. ❌ Se pierde el momento "wow" de la foto en el Loom.
B) Mantener en el alcance
Esfuerzo L, riesgo medio. ✅ Demuestra visión + catálogo cerrado, un diferencial visible. ✅ Cierra el ciclo de solicitudes al admin. ❌ Exige resolver la política de retención y el precio antes de construirla.

## currentDecision (S2-offline)
Commitment comparison:
```text
Compromiso                 | Fuente      | Actual             | A (aplazar cola)                    | B (mantener)
Cola local + reenvío       | PRD §9, D16 | En MVP             | TODOS.md                            | En MVP
Guardado por serie         | PRD §9      | Local primero      | Directo a servidor, reintento, error visible | Local primero
Clave idempotente por serie| —           | No especificada    | Sí (prepara la cola futura)         | Sí (necesaria)
Indicador "pendiente"      | PRD §9      | Sí                 | Solo "no guardado, reintentar"      | Sí
```
Question: D5 — S2-offline: ¿Aplazo la cola de guardado local y envío al reconectar?
Header: Offline
A) Aplazar la cola (recommended)
Esfuerzo S ahora (guardado directo con reintento), riesgo medio. ✅ Evita la parte más difícil de probar: sincronización, duplicados y orden. ✅ La clave idempotente por serie deja la cola lista para añadirla sin migrar datos. ❌ Sin cobertura en el gimnasio, el usuario ve un error y debe reintentar.
B) Mantener la cola en el MVP
Esfuerzo M, riesgo medio. ✅ No se pierde ninguna serie aunque no haya cobertura. ✅ Responde al problema real de cobertura en gimnasios. ❌ Añade estados (pendiente, duplicado, conflicto) que hay que probar a fondo.

## currentDecision (S3-admin)
Commitment comparison:
```text
Compromiso                  | Fuente                | Actual  | A (reducir)                    | B (mantener)
Uso de IA por usuario/tipo  | §16, guardarraíl 12   | Sí      | Sí                             | Sí
Usuarios + suscripción      | §16                   | Sí      | Sí                             | Sí
Métricas de §17 (3)         | §17                   | Sí      | Sí                             | Sí
Otras 8 métricas            | §16                   | Sí      | TODOS.md (los eventos sí se guardan) | Sí
CRUD de catálogo            | §16                   | Sí      | TODOS.md; catálogo por migración semilla | Sí
Solicitudes de máquinas     | §16                   | Sí      | Sigue a S1                     | Sigue a S1
Tabla de eventos            | §16, D15              | Sí      | Sí, completa                   | Sí
```
Question: D6 — S3-admin: ¿Reduzco el panel de admin al mínimo de la demo?
Header: Admin
A) Reducir al mínimo (recommended)
Esfuerzo S ahora, riesgo bajo. ✅ Mantiene lo que exige CLAUDE.md (coste de IA) y las 3 métricas de la demo. ✅ Los eventos se registran igual, así que las gráficas se añaden después sin perder datos. ❌ El catálogo se edita por migración, no desde la app.
B) Mantener el panel completo
Esfuerzo L, riesgo bajo. ✅ Visión de producto real con embudo, errores y fallos de pago. ✅ Edición del catálogo sin tocar código. ❌ Es una segunda app (CRUD, tablas, gráficas) que no ve el usuario final.

## currentDecision (S4-actividades)
Commitment comparison:
```text
Compromiso                 | Fuente     | Actual | A (aplazar registro)          | B (mantener)
Pantalla 5 del wizard      | §5, D19    | Sí     | Sí                            | Sí
Contexto al plan           | §7         | Sí     | Sí (respuesta del wizard)     | Sí
Registro de un toque       | §12        | Sí     | TODOS.md                      | Sí
Contexto del check-in      | §11        | Registro semanal | Respuesta del wizard + sensaciones + molestias | Registro semanal
```
Question: D7 — S4-actividades: ¿Aplazo el registro diario de actividades externas?
Header: Actividades
A) Aplazar el registro (recommended)
Esfuerzo S ahora, riesgo bajo. ✅ El check-in sigue teniendo sensaciones, molestias y los deportes del wizard. ✅ Quita una pantalla, una tabla y su catálogo de esfuerzo. ❌ El ejemplo del PRD ("sumaste 3 h de pádel") pierde precisión semanal.
B) Mantener el registro
Esfuerzo M, riesgo bajo. ✅ El check-in razona con datos reales de la semana, que es lo más vistoso de D9. ✅ Prepara la recalibración automática de fase 2. ❌ Una pantalla más que el usuario debe recordar usar.

## currentDecision (S5-graficas)
Commitment comparison:
```text
Compromiso          | Fuente | Actual          | A (una gráfica)           | B (mantener)
Gráfica por ejercicio | §14  | Básica gratis   | Para todos                | Básica gratis
Gráficas completas  | §14    | Premium         | TODOS.md                  | Premium
Valor premium       | §14    | 4 ventajas      | 3 ventajas                | 4 ventajas
```
Question: D8 — S5-graficas: ¿Aplazo las gráficas "completas" de premium?
Header: Gráficas
A) Aplazar las completas (recommended)
Esfuerzo S ahora, riesgo bajo. ✅ Una gráfica de carga por ejercicio cubre lo que se ve en el Loom. ✅ Evita definir qué es "completa" sin datos de uso. ❌ Premium pierde una de sus cuatro ventajas.
B) Mantener básica y completas
Esfuerzo M, riesgo bajo. ✅ Premium conserva una ventaja visible y fácil de entender. ✅ Las gráficas son un buen motivo para volver a la app. ❌ Hay que diseñar y construir dos niveles de gráficas.

## Secciones de revisión (profundidad: estrategia; cada "debe probarse" es requisito para quien lo construya)

**Alcance revisado:** PRD v1 menos la foto de máquina (D4). Se mantienen la cola local (D5), el panel completo (D6), el registro de actividades (D7) y los dos niveles de gráficas (D8). Cambios aprobados en esta revisión: D9, D10, D11 y D12.

### 1. Arquitectura
```
                    ┌──────────────── Móvil (Next.js cliente) ────────────────┐
                    │ Wizard (respuestas previas en dispositivo)               │
                    │ Sesión del día ──► COLA LOCAL (clave única por serie) ─┐ │
                    │ Progresión (funciones puras, también en móvil, D9)     │ │
                    └────────────────────────────────────────────────────────┼─┘
                                         │ HTTPS                             │ al reconectar
                    ┌────────────────────▼──── Vercel (rutas servidor) ──────▼─┐
                    │ /plan ─► prompt sin salud (D10) ─► zod + topes ─► guarda  │
                    │ /checkin ─► prompt sin salud ─► mismo validador ─► guarda │
                    │ /sets (sync, idempotente) ─► progresión determinista      │
                    │ /stripe/webhook (firma) ─► subscription_status            │
                    │ /cron/inactividad (CRON_SECRET) ─► Resend                 │
                    └───┬──────────────┬──────────────┬───────────────┬────────┘
                  Supabase (UE)   Anthropic API    Stripe test     Resend (solo a Pablo, D7)
                  Auth+RLS+eventos (plan, check-in)
                  (molestia/cribado sin user_id, D11)
```
- **CRITICAL GAP → resuelto por D9:** cola local frente a la regla de "dos sesiones consecutivas".
- **WARNING:** la API de Anthropic es un punto único de fallo en el paso de la pantalla 10 a la 11. El PRD da un "error claro"; los reintentos y el estado de carga pasan a la revisión de ingeniería.
- Escala: lo primero que fallaría es el coste de la IA; el límite de generaciones (guardarraíl 12) no tiene cifra y debe fijarse en `plan.md`.
- Vuelta atrás: el despliegue anterior en Vercel en minutos; las migraciones solo avanzan.

### 2. Mapa de errores y rescates (nivel capacidad)
```
  CAPACIDAD                 | QUÉ PUEDE FALLAR                                  | ESTADO
  --------------------------|---------------------------------------------------|---------------------------
  Generar plan (IA)         | timeout / 429 / JSON malformado / esquema inválido | Reintento + error claro ✔
                            | ID fuera de catálogo / topes violados             | zod + topes en código ✔
                            | rechazo o respuesta vacía                         | debe probarse por separado
                            | límite de generaciones alcanzado                  | GAP: sin cifra ni mensaje
  Check-in (IA)             | los mismos                                        | GAP menor: sin mensaje de fallo
  Cola de series            | duplicado / sesión anterior pendiente             | D9 ✔
                            | almacenamiento local borrado                      | debe probarse
  Stripe Checkout           | rechazo / cancelación                             | error claro ✔
  Webhook Stripe            | firma inválida / duplicado / fuera de orden       | debe probarse
  Cron inactividad          | Resend falla / destinatario no permitido (D7)     | GAP: sin rastro del envío
  Supabase Free pausado     | staging no responde                               | anotado en CLAUDE.md ✔
```
Regla: cada fallo de IA lleva un mensaje distinto (reintentable frente a límite) y una fila en el registro de llamadas de IA; nada de `catch` genérico.

### 3. Seguridad
| Amenaza | Prob. | Impacto | Estado |
|---|---|---|---|
| Datos de salud enviados a la API de Anthropic | Alta | Alto | Resuelto por D10 |
| "Molestia" vinculada al usuario en la analítica | Alta | Alto | Resuelto por D11 |
| Escalada a admin vía una columna de rol editable | Media | Alto | Debe probarse (el rol no es editable por RLS) |
| Usuario A lee datos de B | Media | Alto | RLS ✔; faltan tests de RLS |
| Webhook de Stripe falsificado | Media | Alto | Debe verificar la firma |
| Inyección en el prompt | Baja | Medio | Sin texto libre (limitaciones; sensaciones como escalas por D10) ✔ |
| Clave en el repo público | Media | Alto | `.env.local` + revisión de cada commit ✔ |

No verificado: la política de retención de datos de la API de Anthropic (pendiente del §19).

### 4. Flujos de datos y casos límite
| Interacción | Caso límite | Estado |
|---|---|---|
| Wizard → registro | El enlace de confirmación se abre en otro navegador y se pierden las respuestas guardadas en el dispositivo | WARNING: debe probarse |
| Serie hecha | Doble toque o reintento | D9 ✔ |
| Calibración | 3 series sin fijar la carga (§8.4) | Sin definir |
| Calibración | La primera sesión no cabe en 30 min | Sin definir |
| Molestia en calibración | Precarga siguiente sin definir | Sin definir |
| Check-in | Semana sin sesiones; premium que caduca a mitad de semana | Sin definir |
| Fin de la prueba / Stripe | Eventos fuera de orden | Debe probarse |

### 5. Calidad de código
- Un único validador de topes compartido por el plan y el check-in.
- Progresión en funciones puras compartidas por el servidor y el móvil (D9), con un solo conjunto de tests.
- Cola local simple; sin motor de sincronización genérico.

### 6. Tests
```
  NUEVO                              | TIPO        | FELIZ / FALLO / LÍMITE
  -----------------------------------|-------------|----------------------------------------------
  Calibración (§8)                   | Unit        | 2–3 RIR fija / 0 RIR baja / 3ª serie sin fijar
  Doble progresión (§10)             | Unit        | 2 sesiones en el techo sube / falla 2 baja / saltadas no cuentan
  Duplicado + sesión pendiente (D9)  | Unit        | misma clave = 1 serie / precarga con pendientes
  Validador de topes                 | Unit        | válido / 21 series rechaza / grupo 1 vez por semana rechaza
  Exclusión por articulaciones       | Unit        | rodilla excluye / "Ninguna" no excluye
  Cribado (§13)                      | Unit        | "sí" bloquea / articular deriva / embarazo bloquea
  Salida IA                          | Integración | correcto / malformado / ID inventado / rechazo / vacío
  Prompt sin salud (D10)             | Unit        | sin campos de salud
  Eventos sin user_id (D11)          | Unit        | molestia y cribado sin user_id
  RLS                                | Integración | A no lee a B / no puede hacerse admin  ← falta en el PRD
  Webhook Stripe                     | Integración | firma válida / inválida / duplicado
  Onboarding                         | E2E (1)     | del wizard al plan en staging
```
Huecos: tests de RLS y de escalada a admin; conjunto de evaluación fijo (unos 10 perfiles) para elegir entre Sonnet y Haiku (§18).

### 7. Rendimiento
Lo más lento es la generación del plan con reintentos; hay que comprobar el límite de duración de las funciones de Vercel Hobby (no verificado). Índice de series por (usuario, ejercicio, fecha).

### 8. Observabilidad
Registro de IA y panel (D6) ✔. GAP: cada envío del cron de inactividad necesita una fila de resultado. Los logs llevan IDs, nunca contenido de salud.

### 9. Despliegue
Migración en staging → prueba → migración en prod → merge a `main`. Catálogo semilla como migración. Webhooks de Stripe por entorno y bypass de Vercel en staging. No verificado: si los crons de Vercel se ejecutan en previews.

### 10. Trayectoria
Reversibilidad 4/5. El esquema debe permitir multi-gimnasio (el perfil de gimnasio en su propia tabla). Hallazgo de premisa resuelto por D12; queda abierta la definición del premium con IA (R10-premium-ia). Bloqueantes para una producción real: licencia del PAR-Q+, revisión legal y dominio propio.

### 11. Diseño y UX
```
 Bienvenida ─► Foco ─► Experiencia ─► Disponibilidad ─► Deportes ─► Mi gimnasio ─► Registro (18+)
   ─► Consentimiento ──(no)──► salida clara
   ─► Limitaciones ─► Cribado ──(riesgo)──► BLOQUEO empático
                        └─(articular)─► Limitaciones
   ─► Resumen ─► Generar ─► CARGANDO 10–30 s ─► ERROR / LÍMITE
   ─► Plan + disclaimer ─► Calibración ─► Sesión del día
```
| Función | Cargando | Vacío | Error | Éxito | Parcial |
|---|---|---|---|---|---|
| Generar plan | sin definir | — | sin texto | ✔ | — |
| Sesión del día | precarga | calibración ✔ | cola ✔ | ✔ | "sin sincronizar" ✔ |
| Cribado bloqueado | — | — | sin diseñar | — | — |
| Fin de la prueba | — | — | — | — | sin definir |
| Check-in | sin definir | semana vacía sin definir | sin definir | ✔ | — |
| Admin | — | sin datos sin definir | — | ✔ | — |

Riesgos: el valor no aparece hasta la pantalla 11; el registro y el bloqueo del cribado son los puntos de abandono; contraste para la luz del gimnasio y áreas táctiles de al menos 44 px. Recomendado: /plan-design-review.

## Segunda opinión (respaldo nativo: subagente Plan del mismo modelo; Codex no instalado; no es cobertura externa)

Hallazgos del revisor (resumen fiel; informe completo entregado en la sesión del 28/10/2026):
1. **Critical:** no hay fecha de entrega, ni estimación, ni línea de corte; el alcance quedó casi igual. Tampoco hay presupuesto para los entregables sin código (Retos 3, 5, 6, 9 y el Loom).
2. **Critical:** D9–D12 no se han trasladado; `CLAUDE.md` y el PRD §14 siguen diciendo que la sugerencia de carga es premium. Además, los IDs D1–D12 de la revisión chocan con los D1–D26 de `01`.
3. **High:** el SMTP por defecto de Supabase solo envía a los miembros del equipo, y Resend sin dominio solo a Pablo, así que nadie más puede confirmar su email. El panel completo funcionará con los datos de una sola persona.
4. **High:** con regenerar en premium (D12), un usuario gratis que añade una limitación se queda con un plan que la incumple, y eso rompe el guardarraíl 6.
5. **High:** el valor diferencial de la IA choca con D10 y los guardarraíles 2–4; la ideación bloquea el diseño. Propone limitarla a una sesión y añadir un plan determinista de respaldo.
6. **High:** la cola local sin service worker solo sobrevive con la página cargada. Exige cargar la sesión entera de antemano y refrescar el token antes de sincronizar.
7. **Medium:** D11 por filas con fecha se puede reidentificar; debe ser un contador diario en el servidor.
8. **Medium:** D10: los IDs de ejercicios con molestia siguen siendo un dato de salud seudónimo; el test debe ser una lista de campos permitidos.
9. **Medium:** la prueba de 14 días crea dos fuentes de verdad para premium; tras D12 ya no es necesaria.
10. **Medium:** los crons de Vercel Hobby solo se ejecutan en producción; en el doble motor de progresión (D9), el servidor debe mandar.
11. **Low:** falta definir qué es una "sesión"; su ID debe generarse en el móvil.
12. **Low:** `TODOS.md` y `docs/04` sin seguimiento en git; el orden de build de `CLAUDE.md` sigue incluyendo la foto.

Integración (Analyze):
- Correcciones de hecho, sin cambiar lo aprobado: el 2 es cierto (traslado pendiente, en el siguiente paso; se renombran los IDs de esta revisión a **CEO-D1…CEO-D12** al trasladarlos). El 8 es cierto: el test de D10 se concreta como lista de campos permitidos, que es el mismo comportamiento aprobado. El 7 concreta cómo implementar D11 (contador diario en el servidor). El 10 y el 11 concretan D9 (el servidor recalcula al sincronizar, la precarga del móvil es provisional e IDs de sesión generados en el móvil). El 6 son restricciones de D5 para `plan.md`. El 12 es mantenimiento.
- Requieren decisión de Pablo: el 1 (CEO-O1), el 3 (CEO-O3), el 4 (CEO-O4) y el 9 (CEO-O9). El 5 se recoge en R10-premium-ia (con el respaldo determinista como candidato) y no se decide aquí.
- No verificado por mí: la limitación del SMTP de Supabase y la de los crons de Vercel en previews. Son creíbles y coinciden con lo que conozco, pero hay que comprobarlas en la documentación antes del build.

| ID y responsable | Contrato y evidencia | Actual | Propuesto | Estado | Aprobación exacta y alcance |
|---|---|---|---|---|---|
| CEO-O1 (Pablo) | Revisor #1; `01` §2.A; 02:33 | Sin fecha ni corte | A: fijar fecha + punto "demo completa" tras Auth/wizard → plan → sesión/progresión → check-in → Stripe → Resend; después, en orden: cola local, registro de actividades, panel completo, gráficas completas, recortables si la fecha se escapa | approved (fecha pendiente) | CEO-D13: "Fecha + línea de corte". Alcance: orden de build con punto "demo completa"; cola local, registro de actividades, panel completo y gráficas completas van después y son recortables si la fecha se escapa (no anula CEO-D5–D8). La fecha la aporta Pablo |
| CEO-O3 (Pablo) | Revisor #3; D7; D12 de `01` | Confirmación por email implícita | A: desactivar la confirmación por email en el MVP (documentado como riesgo) + datos de demostración sintéticos en staging para el panel | declined (kept) | CEO-D14: "Mantengamos la confirmación [...] con mi correo de Google puedo crear N cuentas con + y además puedo pedir amigos que lo prueben [...] que sea multiusuario es imprescindible". Alcance: se mantiene la confirmación por email. **Verificación bloqueante antes del build:** que Supabase Auth pueda enviar la confirmación a alias `+` y a terceros con la configuración de correo elegida (SMTP por defecto o Resend sin dominio, D7); si no, Pablo decide sobre un dominio verificado |
| CEO-O4 (Pablo) | Revisor #4; guardarraíl 6; PRD §6, §10 | Cambiar limitaciones o equipo exige regenerar (premium) | A: al cambiar limitaciones o equipo, refiltrado determinista gratis del plan actual con sustitución automática (misma lógica que "Sustituir") | approved | CEO-D15: "Refiltrado gratis automático". Alcance: al cambiar limitaciones o equipo, el plan actual se refiltra de forma determinista y gratis, con sustitución automática; si no hay alternativa, el hueco queda vacío con aviso; test unitario |
| CEO-O9 (Pablo) | Revisor #9; PRD §14 | Prueba de 14 días (hipótesis) | A: aplazar la prueba a TODOS.md | declined (kept) | CEO-D16: "Mantener la prueba". Alcance: la prueba de 14 días sigue en el MVP; quien la construya debe demostrar que "es premium" sale de una única función (reloj de la prueba + `subscription_status`) |
| CEO-T1 legal (Pablo) | Bloqueantes legales para producción | Dispersos en §13, `01`, §19 | TODOS.md | approved | CEO-D17: "Añadir a TODOS.md" |

## currentDecision (CEO-O1)
Question: D13 — CEO-O1: ¿Fijamos fecha y una línea de corte "demo completa"?
Header: Fecha
A) Fecha + línea de corte (recommended)
Esfuerzo S, riesgo bajo. ✅ No anula D5–D8: solo los ordena después del núcleo. ✅ Si la fecha se escapa, sabes qué cae sin rehacer nada. ❌ Necesito que me des la fecha de entrega (escríbela en "Other" si no encaja).
B) Solo orden, sin fecha
Esfuerzo S, riesgo medio. ✅ Ordena igual el build con el núcleo primero. ✅ No te compromete a una fecha. ❌ No hay forma de saber cuándo cortar.
C) Dejarlo para plan.md
Esfuerzo S (cero ahora), riesgo medio. ✅ Compound Engineering re-estima con el plan. ✅ No cambia nada ahora. ❌ El diseño (fase 2) arranca sin saber qué es recortable.

## currentDecision (CEO-O3)
Question: D14 — CEO-O3: ¿Cómo se registran usuarios que no son Pablo sin dominio propio?
Header: Email
A) Sin confirmación + datos demo (recommended)
Esfuerzo S, riesgo medio. ✅ Cualquiera puede registrarse en la demo; se resuelve además el caso del enlace en otro navegador. ✅ El panel enseña datos en el Loom. ❌ No se verifica que el email sea real (riesgo documentado hasta tener dominio).
B) Solo sin confirmación
Esfuerzo S, riesgo medio. ✅ Desbloquea el registro. ✅ Sin datos falsos en la BBDD. ❌ El panel completo (D6) sale casi vacío en el Loom.
C) Mantener la confirmación
Esfuerzo S, riesgo alto. ✅ Verifica el email como en un producto real. ✅ No cambia el flujo del PRD. ❌ Solo tú podrías registrarte: la demo no demuestra multiusuario.

## currentDecision (CEO-O4)
Question: D15 — CEO-O4: ¿Qué pasa con el plan de un usuario gratis que añade una limitación?
Header: Seguridad
A) Refiltrado gratis automático (recommended)
Esfuerzo S, riesgo bajo. ✅ Ningún plan incumple nunca las limitaciones, sea gratis o premium. ✅ Reutiliza "Sustituir", sin IA ni coste. ❌ Si no hay alternativa válida, el hueco queda vacío con un aviso.
B) Bloquear la sesión hasta regenerar
Esfuerzo S, riesgo medio. ✅ Nunca se entrena un ejercicio excluido. ✅ Empuja hacia premium. ❌ Un usuario gratis no puede seguir entrenando: castiga la seguridad.
C) Regenerar gratis en ese caso
Esfuerzo S, riesgo bajo. ✅ Plan nuevo y coherente. ✅ Sencillo de explicar. ❌ Coste de IA en gratis y otra vía para saltarse el límite de generaciones.

## currentDecision (CEO-O9)
Question: D16 — CEO-O9: ¿Aplazo la prueba premium de 14 días?
Header: Prueba
A) Aplazar a TODOS.md (recommended)
Esfuerzo S (cero ahora), riesgo bajo. ✅ Una sola fuente de verdad: `subscription_status` del webhook. ✅ Tras CEO-D12 la promesa central ya es gratis. ❌ El usuario prueba premium solo pagando (en modo test).
B) Mantener la prueba
Esfuerzo S, riesgo medio. ✅ Deja probar el check-in IA sin pagar. ✅ Es una palanca de conversión conocida. ❌ Dos fuentes de verdad (reloj y webhook) y más estados que probar.

**Nota sobre IDs:** las respuestas D1–D17 de esta revisión se citan como **CEO-D1…CEO-D17** para no chocar con D1–D26 de `docs/01-contexto-y-criterios.md`. "Reabre D4" en la fila R10-valor se refiere a **01-D4** (freemium).

Approval readiness: PASS. Filas comprobadas: R0-office-hours (CEO-D1), R0-learnings (CEO-D2), R0-mode (CEO-D3), S1-foto (CEO-D4, aplazado), S2–S5 (CEO-D5–D8, mantenidos), R1-sync (CEO-D9), R3-ia-salud (CEO-D10), R3-molestia (CEO-D11), R10-valor (CEO-D12), CEO-O1 (CEO-D13), CEO-O3 (CEO-D14, mantenido), CEO-O4 (CEO-D15), CEO-O9 (CEO-D16, mantenido), CEO-T1 (CEO-D17). Abiertos, fuera del trabajo aceptado: R10-premium-ia, la fecha de CEO-O1 y la verificación de CEO-O3.

## Salidas de la revisión

### Comprobaciones de realidad
Ver Paso 0 (7 filas manuales). PLAN_REALITY: no ejecutado (`gstack-plan-reality` requiere `bun`, no instalado) → resultado **incompleto por herramienta**, 7/7 filas escritas a mano, 3 sin verificar (premisas).

### Fuera de alcance
- **Aplazado (TODOS.md):** foto de máquina + solicitudes de máquinas al admin (CEO-D4): integración más cara, con pendientes abiertos. Bloqueantes legales de producción (CEO-D17): no son código.
- **Rechazado:** ninguno. Se propusieron cuatro recortes que Pablo decidió mantener (CEO-D5–D8) y el aplazamiento de la prueba (CEO-D16, mantenida); no se descartó nada.

### Lo que ya existe
Solo el esqueleto de la fase 0 (Next.js 16, shadcn `button.tsx`, Vitest, Supabase CLI). La lógica de Sala de Máquinas (`01` §1) sirve como especificación y oráculo de tests de la progresión; no se reutiliza código (01-D2).

### Delta frente al ideal
Tras esta revisión: núcleo más seguro (D9, D10, D11, D15), promesa central gratis (D12) y orden de build con corte (D13). Siguen lejos del ideal a 12 meses: dominio propio, emails reales y retención medida; los bloqueantes legales están en TODOS.md.

### Registro de errores y rescates (nivel capacidad)
Ver sección 2. Quien lo construya debe probar: rechazo y respuesta vacía de la IA como casos distintos; cifra y mensaje del límite de generaciones; firma, duplicado y orden del webhook; borrado del almacenamiento local; fila de resultado por cada envío del cron.

### Registro de modos de fallo
```
  CAPACIDAD          | MODO DE FALLO                      | ¿RESCATADO? | ¿TEST?    | EL USUARIO VE        | ¿REGISTRADO?
  -------------------|------------------------------------|-------------|-----------|----------------------|------------
  Plan IA            | JSON/esquema inválido              | Sí (retry)  | Plan (S6) | Error claro          | Log IA
  Plan IA            | Límite alcanzado                   | Sin definir | No        | Sin definir          | Log IA
  Cola + progresión  | Duplicado / sesión pendiente       | Sí (D9)     | Sí (D9)   | "Sin sincronizar"    | Panel
  Cola               | Token caducado al sincronizar      | Sin definir | No        | Sin definir          | No
  Refiltrado         | Limitación nueva en plan gratis    | Sí (D15)    | Sí (D15)  | Sustitución o aviso  | —
  Webhook            | Duplicado / fuera de orden         | Sin definir | Plan (S6) | Estado premium       | Panel
  Cron inactividad   | Resend falla                       | No          | No        | Nada (silencioso)    | No  ← CRITICAL GAP
  Confirmación email | No llega a terceros (CEO-D14)      | No          | No        | No puede registrarse | No  ← verificación bloqueante
```
CRITICAL GAPS: 1 (fallo silencioso del cron). Remedio propuesto (fila de resultado por envío), pendiente para la revisión de ingeniería.

### Diagramas
Arquitectura (sección 1), mapa de errores (sección 2), tests (sección 6), flujo de usuario (sección 11) y estado ideal (0C). Sin diagramas anteriores en el repo: 0 obsoletos.

## Tareas de implementación
Salen de los hallazgos aprobados. Son requisitos para `plan.md`; esta revisión no construye nada.

- [ ] **T1 (P1, humano: ~1 h / CC: ~10 min)**: docs. Trasladar CEO-D4 y D9–D17 al PRD (v1.1), a `01` (nueva decisión que sustituye a 01-D4) y a `CLAUDE.md` (freemium, orden de build sin foto y con corte). Requiere el visto bueno de Pablo antes de editar.
  - Surge de: segunda opinión #2 y CEO-D12.
  - Archivos: `docs/02-prd-v1.md`, `docs/01-contexto-y-criterios.md`, `CLAUDE.md`.
  - Verificar: sin "sugerencia de carga" en la columna premium; el orden de build sin la foto.
- [ ] **T2 (P1, humano: ~30 min / CC: ~10 min)**: auth. Comprobar en la documentación de Supabase y Resend si la confirmación llega a alias `+` y a terceros (CEO-D14).
  - Surge de: segunda opinión #3.
  - Archivos: por determinar.
  - Verificar: un registro de prueba en staging con un alias `+` y con el email de un tercero.
- [ ] **T3 (P1, humano: ~2 h / CC: ~30 min)**: producto. Sesión de ideación del premium con IA, limitada a una sesión, dentro de los guardarraíles 2–4 (R10-premium-ia, CEO-D12).
  - Surge de: CEO-D12 y segunda opinión #5.
  - Archivos: por determinar.
  - Verificar: lista de funciones premium aprobada por Pablo antes del diseño.
- [ ] **T4 (P1, humano: ~1 día / CC: ~30 min)**: progresión. Funciones puras compartidas entre servidor y móvil, clave única por serie y por sesión, el servidor recalcula al sincronizar (CEO-D9).
  - Surge de: sección 1 y segunda opinión #10–11.
  - Archivos: por determinar (`src/lib/…`).
  - Verificar: `npx vitest run` con los casos de duplicado y de sesión pendiente.
- [ ] **T5 (P1, humano: ~3 h / CC: ~15 min)**: IA y privacidad. Lista de campos permitidos en los prompts y test contra ella; texto del consentimiento que nombra a Anthropic (CEO-D10).
  - Surge de: sección 3 y segunda opinión #8.
  - Archivos: por determinar.
  - Verificar: test unitario de la lista de campos.
- [ ] **T6 (P1, humano: ~2 h / CC: ~10 min)**: analítica. Contadores diarios en el servidor para molestia y cribado, sin `user_id` ni filas por evento (CEO-D11).
  - Surge de: sección 3 y segunda opinión #7.
  - Archivos: por determinar (migración).
  - Verificar: test unitario y que el cliente no puede insertar en esos contadores.
- [ ] **T7 (P1, humano: ~3 h / CC: ~15 min)**: plan. Refiltrado determinista y gratis al cambiar limitaciones o equipo (CEO-D15).
  - Surge de: segunda opinión #4.
  - Archivos: por determinar.
  - Verificar: test unitario (rodilla añadida → la sentadilla se sustituye o queda un hueco con aviso).
- [ ] **T8 (P2, humano: ~30 min / CC: ~5 min)**: plan. Orden de build con el punto "demo completa" y la fecha de Pablo (CEO-D13).
  - Surge de: segunda opinión #1.
  - Archivos: `plan.md` (cuando exista).
  - Verificar: `plan.md` marca qué piezas son recortables.

Artefacto JSONL de tareas: **no persistido** (`jq` no está instalado).

## Resumen de la revisión
```
  +====================================================================+
  |            MEGA PLAN REVIEW — COMPLETION SUMMARY                   |
  +====================================================================+
  | Mode selected        | SCOPE REDUCTION (alcance efectivo ≈ HOLD)   |
  | System Audit         | Solo esqueleto; staging 4 docs por delante  |
  | Step 0               | 5 recortes propuestos: 1 aplazado, 4 mantenidos |
  | Section 1  (Arch)    | 3 issues (1 crítico resuelto con D9)        |
  | Section 2  (Errors)  | 10 capacidades mapeadas, 3 GAPS             |
  | Section 3  (Security)| 7 issues, 4 High (2 resueltos: D10, D11)    |
  | Section 4  (Data/UX) | 7 casos límite, 5 sin definir               |
  | Section 5  (Quality) | 3 issues                                    |
  | Section 6  (Tests)   | Diagrama hecho, 2 gaps                      |
  | Section 7  (Perf)    | 1 issue (límite de Vercel, sin verificar)   |
  | Section 8  (Observ)  | 1 gap                                       |
  | Section 9  (Deploy)  | 2 risks flagged                             |
  | Section 10 (Future)  | Reversibility: 4/5, debt items: 3           |
  | Section 11 (Design)  | 6 issues                                    |
  +--------------------------------------------------------------------+
  | NOT in scope         | written (2 items)                           |
  | What already exists  | written                                     |
  | Dream state delta    | written                                     |
  | Error/rescue registry| 10 rows, 1 CRITICAL GAP                     |
  | Failure modes        | 8 total, 1 CRITICAL GAP                     |
  | TODOS.md updates     | 2 items (foto, legal)                       |
  | Scope proposals      | 0 (modo REDUCTION)                          |
  | CEO plan             | skipped by mode                             |
  | Outside voice        | codex no instalado → subagente nativo completado (no cuenta como externo) |
  | Lake Score           | 3/3                                         |
  | Diagrams produced    | 5 (arquitectura, errores, tests, flujo, estado ideal) |
  | Stale diagrams found | 0                                           |
  | Unresolved decisions | 3 (abajo)                                   |
  | Reality rows         | 7/7 manuales (PLAN_REALITY sin ejecutar), 3 sin verificar |
  +====================================================================+
```

### Decisiones abiertas al cierre de la primera parte
- R10-premium-ia, CEO-O1 y CEO-O3: resueltas en el seguimiento de abajo.

## Seguimiento del 28/10/2026 (cierre de la fase 1)

Pablo resolvió las tres decisiones abiertas. Quedan trasladadas al PRD v1.1, a `01` (D27–D37), a `CLAUDE.md`, a `03` y a `TODOS.md` (tarea T1 hecha).

| ID | Respuesta de Pablo | Resultado |
|---|---|---|
| R10-premium-ia | Eligió "1 Coach que explica, 2 Detector de estancamiento, 3 Semana adaptada, 4 / 5 también" entre 5 caminos con su coste mensual estimado | D32: premium con las 5 funciones de IA (PRD §11). Interpretación: "4 / 5 también" se lee como **ambas**, la 4 y la 5, sin nota que lo precise; Pablo debe confirmarla. Solo la 1 queda dentro de la demo completa; de la 2 a la 5 van tras la línea de corte |
| CEO-O1 | "Vamos a entregar esto a finales de la semana que viene [...] 6 días de trabajo [...] unas 5 horas"; fecha elegida: viernes 6/11/2026 | D33: entrega el 6/11/2026 y orden de build con línea de corte (PRD §20) |
| CEO-O3 | "Solamente soy yo el usuario activo, de acuerdo [...] si la salida es el dominio, apuntémoslo como cosas de hacer si queremos salir a producción real" | D34: se mantiene la confirmación; dominio propio en `TODOS.md` (T2 ya no bloquea la demo) |
| Fallo pendiente (cron sin rastro) | "Con lo que te acabo de responder, vamos adelante" | Sigue como requisito para la revisión de ingeniería: una fila de resultado por cada envío del cron |

Estimación del coste de IA (precios de la API a 6/10/2026: Sonnet 5.5, 2 $/10 $ por millón de tokens de entrada/salida, caché 0,20 $; Haiku 5.5, 0,10 $/0,50 $). Con un tamaño supuesto de 4–6 mil tokens de entrada y 2–3 mil de salida por llamada, todo el premium sale por < 1 $ por usuario y mes con Sonnet (~0,05 $ con Haiku), frente a un precio de 5 €/mes. Se mide en el build.

Herramientas: `bun` está instalado vía winget pero no estaba en el PATH de esta sesión. Con el PATH explícito ya se han guardado el historial de la revisión, la decisión y el aprendizaje.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | ISSUES OPEN | mode: SCOPE_REDUCTION, 1 critical gaps |
| Outside Review | codex (no instalado) → subagente nativo | Independent 2nd opinion | 1 | unavailable (externo) | 12 findings (nativos); 12 resueltos o integrados; 0 externos: no completed external review |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **OUTSIDE COVERAGE:** codex, plan-review, no instalado → no completed external review. El respaldo nativo (subagente Plan, mismo modelo) completó con 12 hallazgos, integrados en CEO-D13–D16, T1–T8 y los requisitos de las secciones.
- **VERDICT:** no hay ninguna revisión CLEAR; la revisión CEO queda con 1 critical gap (el cron sin rastro) asignado a la revisión de ingeniería; eng review required.

**UNRESOLVED DECISIONS:**
- Confirmar que "4 / 5 también" incluye las dos funciones, la sesión exprés y "Pregúntale a BUDDY" (D32), al empezar la fase de diseño
