# Mini sistema de diseño — BUDDY (fase 2)

> Versión del 12/11/2026, con las decisiones D38–D42 (`docs/01`). Pendiente de `/plan-design-review`. Prototipo navegable: `docs/diseno/prototipo.html` (se abre en el navegador; el menú de la izquierda lleva a cada pantalla y estado).

## 1. Dirección
**"Venice 89 × arcade":** la cultura de gimnasio de Los Ángeles de los 80 y 90 (púrpura y oro) y los videojuegos retro, aplicados a un producto moderno y amable. El color es solo inspiración: ningún nombre, escudo ni marca de terceros.

Reglas de tono:
- Lo retro está en los **guiños** (marcador, trama, franja, celebraciones pixeladas). La zona de datos (peso, repeticiones) siempre queda limpia.
- La seguridad nunca se gamifica: Molestia, bloqueo del cribado y errores van con la cabecera sobria, sin trama, sin animación y sin chistes.
- La UI va en español. Los guiños de arcade también ("NIVEL ARRIBA", "¿CONTINUAR?"), sin anglicismos ni calcos ("+1 racha" no).
- **Que no parezca una app genérica hecha con IA** (feedback de Pablo, 12/11):
  - Nada de puntos medios (·) ni guiones (– —) como separadores en la UI. Se escribe con frases, comas o estructura (etiqueta arriba, dato abajo). Los rangos van con "a": "de 8 a 12 repeticiones".
  - Esquinas duras (2–6 px) y sombra dura; nada de píldoras ni radios grandes.
  - Los iconos son de trazo grueso con terminación cuadrada; los emojis de las tarjetas del wizard se cambiarán por iconos propios.
  - Las frases dicen lo que pasa en palabras de gimnasio: "Llevas 1:42 de descanso", no "hace 1:42 desde tu última serie".

## 2. Color
Tema claro **L3** (marcador morado + papel crema + trama) y tema oscuro, con selector. El contraste está calculado con la fórmula WCAG 2.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--lemon` | `#FFE03A` | `#FFE03A` | Primario: relleno del CTA, selección, barra de progreso, títulos sobre el marcador |
| `--on-lemon` | `#1A0F24` | `#1A0F24` | Texto sobre limón (14,0:1) |
| `--bg` | `#FFF8E1` (crema) | `#120A1C` | Fondo |
| `--surface` | `#F3ECDA` | `#1E1330` | Tarjetas, stats, campos |
| `--ink` | `#1A0F24` | `#F7F2FF` | Texto principal (17,4:1 · 17,6:1) |
| `--muted` | `#6B5E7B` | `#A99BBB` | Texto de apoyo (5,6:1 · 6,8:1) |
| `--secondary` | `#5B2A86` | `#B38CFF` | Acciones secundarias, etiquetas, marcas de las gráficas (9,3:1 · 6,8:1) |
| `--band` | `#3D1A5E` | `#2A1A45` | Marcador (cabecera). Limón encima: 10,6:1 · 12,0:1 |
| `--danger` | `#C2185B` | `#FF5FA2` | Solo Molestia y errores (5,5:1 · 6,2:1) |
| `--ok` | `#0E7C72` | `#2ED3C1` | Serie hecha, sincronizado, calibración. En claro (4,8:1) solo en barras e iconos, no en texto pequeño |
| `--warn` | `#B54708` | `#FF9F45` | Sin sincronizar, hueco vacío, fin de la prueba (5,1:1 · 8,6:1) |
| Franja | limón · `#FF5FA2` · `#2ED3C1` | igual | Decorativa, 8 px, bajo el marcador |

**Reglas duras:**
1. El limón sobre crema o blanco no llega a 1,3:1: nunca como texto, icono ni borde sobre fondo claro. Va solo de relleno, con tinta encima, o sobre el marcador morado.
2. Los colores de estado (`danger`, `ok`, `warn`) siempre van con icono y texto, nunca solos.
3. Marca de agua (la "B", hasta que haya logo) al 6 % de opacidad y cortada en una esquina, **solo en pantallas vacías** (bienvenida, estados vacíos y de error). Nunca detrás de un dato.

## 3. Tipografía
Todas son de Google Fonts con licencia OFL; en la app se cargan con `next/font`. Atkinson Hyperlegible Next está diseñada para máxima legibilidad (Braille Institute); se eligió frente a Barlow y Arial comparándolas en el prototipo.

| Rol | Fuente | Estilo |
|---|---|---|
| Títulos, números grandes, CTA | **Archivo** (eje de anchura al 125 %) | 900, cursiva, mayúsculas en títulos y CTA. Cifras tabulares |
| Cuerpo y controles | **Atkinson Hyperlegible Next** (decidido el 12/11, D42) | 400–800. Su cero lleva barra: las cifras de datos (gráficas, descanso) van en Archivo |
| Celebraciones y etiquetas | **Press Start 2P** | 9–14 px, solo textos cortos en mayúsculas |

Escala (px): 12 · 13 · 14 · 15 (cuerpo) · 17 · 20 · 24 · 28 (título de pantalla) · 52 (peso y repeticiones) · 62 (logotipo).

## 4. Espacio, forma y tacto
- Espaciado de 4 en 4: 4 · 8 · 10 · 12 · 16 · 18 · 24. Margen lateral de pantalla: 18.
- Radios: 2 (botones pequeños), 4 (controles y chips) y 6 (tarjetas, CTA y hoja inferior). Esquinas duras, con estética de recreativa.
- **Área táctil mínima de 44 px**; en la sesión, 48 px, y 60 px el CTA. Las acciones principales van en la mitad inferior (uso con una mano).
- Bordes de 2 px en tinta y sombra dura de 4–5 px en morado, sin desenfoque: es el "botón de recreativa".

## 4 bis. Fluido y revisión anti "app genérica" (12/11)
- Nada de anchos fijos: el teléfono del prototipo es un contenedor (`container-type: inline-size`) y títulos, números y márgenes se miden con `clamp()` contra su ancho. Comprobado a 320, 375 y 430 px con el selector de ancho del prototipo. Por debajo de 340 px, la botonera de la sesión pasa a 2 × 2.
- Fuera las cajas con cabecera sombreada y las tarjetas rellenas: listas y secciones usan reglas de imprenta (título en Archivo cursiva con filete de 3 px y líneas finas entre filas). Las únicas cajas con relleno son los datos de la sesión (peso y repeticiones).
- Un elemento destacado por pantalla como máximo: la pegatina limón girada (plan) o el banner "NIVEL ARRIBA" (sesión).
- Los cambios del coach van numerados con cifras grandes, no con barra lateral de color.
- Iconos propios de trazo grueso en las tarjetas del wizard, sin emojis; marcadores cuadrados en vez de ✓ ▶ ○.
- Lo que no se mueve de su sitio: un dato nuevo (como "subes 2,5") va en el flujo del texto, nunca superpuesto y nunca empujando la alineación de la columna vecina.

## 5. Componentes
| Componente | Notas |
|---|---|
| Marcador (cabecera) | Variantes: normal (trama + título limón), **sobria** (sin trama ni franja, título blanco: bloqueo y errores) y calibración (turquesa) |
| Barra de progreso por segmentos | Wizard (11 segmentos), sesión (ejercicios) y carga (10 segmentos) |
| CTA primario | Limón, borde de tinta y sombra morada; se hunde al pulsar (`steps(2)`). Uno por pantalla |
| Botón secundario / enlace | Borde morado / texto subrayado |
| Tarjeta tocable | Selección única (foco, presets); seleccionada = limón + sombra |
| Chip | Selección múltiple (equipo, deportes, limitaciones); seleccionado = morado con ✓ |
| Sí/No segmentado | Cribado |
| Stat grande | Peso y repeticiones, con +/− debajo |
| Escala 1–5 | Check-in (sensaciones) y calibración (0 · 1 · 2 · 3 · 4+) |
| Aviso | `info` / `ok` / `warn` / `danger`, con icono |
| Hoja inferior | Molestia, Sustituir |
| Etiqueta pixelada | Estado o contexto (`PLAN LISTO`, `PREMIUM`, `CALIBRACIÓN`) |
| Pop arcade | Celebración de 1,1 s en Press Start 2P; no bloquea el siguiente toque. Textos: "SERIE 2 HECHA / A POR LA 3" y "EJERCICIO HECHO / AL SIGUIENTE" |
| Botonera de la sesión | 4 botones con icono y texto en dos líneas: **Cambiar ejercicio** (abre alternativas), **Hacer al final** (lo pasa al final, con Deshacer), **Saltar hoy** ("No cuenta para tu progreso y no te penaliza", con Deshacer) y **Tengo molestia** (magenta, abre la hoja de parada) |
| Subida de carga | Cuando la doble progresión sube peso: banner "NIVEL ARRIBA **+2,5 KG**" con el porqué ("Hoy subes de 42,5 a 45 kg…") y "subes 2,5" en la línea de la unidad, bajo el peso |
| Descanso | "Llevas 1:42 de descanso": cuenta hacia arriba, sin alarma (PRD §9) |
| Aviso breve (toast) | Confirma una acción inmediata con Deshacer, durante 4 s |
| Vacío con marca de agua | Título + explicación + una acción |

## 6. Movimiento
- Todo a saltos (`steps()`), como los sprites. Duración máxima de 1,2 s, sin bloquear la interacción.
- Celebraciones: serie hecha ("SERIE 2 OK"), peso fijado en la calibración y "NIVEL ARRIBA" cuando la doble progresión sube la carga (lo dispara la regla, no la IA).
- **Sin animación:** Molestia, bloqueo, errores y avisos de seguridad.
- `prefers-reduced-motion` → todo estático.

## 7. Estados por pantalla (completa el mapa de la §11 de docs/04)
| Función | Cargando | Vacío | Error | Éxito | Parcial |
|---|---|---|---|---|---|
| Generar plan | Barra de 10 segmentos + "CARGANDO…" + 4 pasos reales (filtrar, elegir, comprobar volumen, montar semana) | — | Cabecera sobria: "Fallo de conexión. Tus respuestas están guardadas" + Reintentar. Límite: "Por ahora, no más" + Ver mi plan | Plan + aviso de calibración | Refiltrado con hueco vacío: aviso `warn` + fila "sin alternativa" |
| Sesión del día | Precarga entera al empezar (D28) | Primera vez → calibración | Cola local | Pop "SERIE OK" | Chip "⟳ N sin sincronizar" en el marcador |
| Cribado bloqueado | — | — | Pantalla sobria: "Primero, un profesional" + Revisar respuestas / Salir | — | Articular: aviso que lleva a Limitaciones |
| Fin de la prueba | — | — | — | — | "¿CONTINUAR?": qué sigue gratis + qué da premium + CTA |
| Check-in | Barra + "PENSANDO…" | "Aún no hay partida" + Empezar sesión | "El coach no responde. Tu plan sigue igual; este intento no cuenta" + Reintentar | Cambios con su porqué + lo que hicieron las reglas | — |
| Admin | Fuera de esta fase (después de la línea de corte) | | | | |

## 8. Gráficas (aceptada por Pablo el 12/11; cierra el [pendiente] de PRD §14)
Las gráficas tienen una serie cada una, sin leyenda (el título la nombra), con tooltip al pasar el dedo y la opción "Ver como tabla". El color de las marcas es `--secondary` y el texto, tinta.

| Nivel | Contenido |
|---|---|
| **Básica (gratis)** | Peso de trabajo por ejercicio (selector de ejercicio), últimas 8 semanas |
| **Completas (premium)** | 1) La misma gráfica con historial completo. 2) Series por grupo muscular esta semana frente a la franja objetivo del foco (conecta con los topes). 3) Constancia: sesiones hechas de las planificadas (4 semanas). 4) Mejores series por ejercicio |

En el orden de build van en el 12 (después de la línea de corte). La básica se construye con la sesión del día (3).

## 9. Premium 4 y 5 (D32, confirmadas el 12/11)
En el prototipo solo aparecen como puntos de entrada con la etiqueta `PREMIUM` en la pantalla del plan: **Sesión exprés** ("Hoy tengo poco tiempo") y **Pregúntale a BUDDY**. Siguen después de la línea de corte (13 y 14); su diseño de detalle se hará si llegan.

## 10. Abierto
- Logo: provisional, el logotipo de texto "BUDDY" (Archivo 900 cursiva, limón con sombra magenta). La marca de agua usa la "B".
- Ilustraciones de ejercicios: estilo por decidir con el catálogo (pixel art o línea gruesa en limón y morado).
- Check-in: **decidido (12/11)**, el usuario manda: ve el ajuste y elige "Aplicar a mi semana" o "Mantener mi plan".
- Redacción del cribado: provisional hasta cotejarla con el PAR-Q+ 2023.

## 11. Revisión de diseño (`/plan-design-review`, 12/11): decisiones

### 11.1 Navegación (D3: aceptada)
Barra inferior fija de 4 pestañas, visible en todas las pantallas salvo el wizard, la sesión en curso, la calibración y las hojas inferiores:

```
┌─────────────────────────────┐
│  [marcador de la pestaña]   │
│                             │
│   contenido de la pestaña   │
│                             │
├──────┬──────┬───────┬───────┤  ← borde superior de 2 px en tinta; fondo crema
│ Hoy  │ Plan │Progreso│Ajustes│  ← icono de trazo grueso + texto; activa = barra limón arriba
└──────┴──────┴───────┴───────┘     altura 56 px, cada pestaña ≥ 44 px de ancho

Hoy ─────► Empezar sesión ─► Sesión (pantalla completa, sin barra) ─► Fin de sesión ─► Hoy
 ├──────► Check-in (cuando toca; premium)
 └──────► Registrar actividad
Plan ────► semana y ejercicios del plan actual
Progreso ► gráficas (básica / completas)
Ajustes ─► limitaciones, equipo, cuenta y privacidad, preferencias
```
- **Hoy** es el inicio tras el wizard: la sesión del día (o el próximo día de entreno), los días de prueba que quedan y el check-in cuando corresponde.

### 11.2 Pantalla Plan: una sola tarea (D4: aceptada)
- **Pestaña Plan (consulta):** marcador con el foco y los días ("3 días, cuerpo completo"); una línea de aviso médico justo bajo la cabecera; la semana (L a D) y la lista de ejercicios por día. Sin botón de empezar: empezar se hace desde Hoy.
- **Plan recién generado (primera vez, pantalla 11 del wizard):** la misma vista con la pegatina "PRIMERA SESIÓN: es de calibración" y un único CTA, "Empezar calibración". Es la única variante con CTA.

### 11.3 Accesos a premium 4 y 5 (D5: aceptada)
Los accesos a Sesión exprés y Pregúntale a BUDDY solo se muestran cuando su función está construida (orden de build 13 y 14). Su sitio está reservado en Hoy, como filas de lista con la etiqueta PREMIUM; no aparecen en la pestaña Plan.

### 11.4 Cribado sin respuestas por defecto (D6: aceptada)
Ninguna de las 8 preguntas viene marcada. "Siguiente" queda desactivado hasta responder las 8, y a su lado un contador explica por qué ("Te quedan 3"). Cada respuesta es una decisión activa (guardarraíl 5). En el prototipo actual las preguntas vienen con "No" marcado: hay que corregirlo.

### 11.5 Fin de sesión (D7: aceptada, con añadido de Pablo)
Pantalla completa tras la última serie del último ejercicio, sin barra de pestañas:
1. Marcador: etiqueta "PARTIDA TERMINADA", título "SESIÓN COMPLETADA", subtítulo con día y duración ("Torso, 48 minutos").
2. Pop arcade de entrada, una sola vez: "SESIÓN COMPLETADA / BIEN JUGADO".
3. Resumen: ejercicios hechos de los planificados y series hechas. Cada subida de carga, con su "NIVEL ARRIBA +2,5 KG".
4. Si hubo Molestia o un ejercicio saltado: una línea sobria, sin animación ni celebración ("Jalón al pecho: parado por molestia. No sube carga.").
5. Lo que viene: próxima sesión y su peso clave ("El viernes: pierna. Prensa a 50 kg").
6. **Actividad extra (petición de Pablo):** "¿Has hecho algo más hoy? Pádel, carrera, una clase… Apúntalo y tu coach lo tendrá en cuenta." Botón secundario "Registrar actividad". Aparece cuando el registro de actividades esté construido (orden de build 11), con el mismo criterio que D5.
7. CTA único: "Volver a Hoy".

### 11.6 Corregir una serie (D8: aceptada)
- Tras "Serie hecha": aviso breve "Serie 2 hecha." con "Deshacer" durante 5 s.
- Durante la sesión, tocar el marcador de una serie hecha (los segmentos turquesa) abre una hoja inferior "Editar serie 2" con peso y repeticiones (+/−), "Guardar" y "Borrar serie".
- Al editar, la sugerencia se recalcula con las mismas reglas; al sincronizar, manda el servidor (D28). Una vez cerrada la sesión, no se puede editar en el MVP.

### 11.7 Errores de IA: conexión frente a validación (D9: aceptada)
Válido para generar el plan, el check-in y el resto de funciones con IA. Cabecera sobria en los dos casos.
| Tipo | Título | Texto | Acciones |
|---|---|---|---|
| Conexión (no hay red o el servidor no responde) | "Sin conexión" | "Tus respuestas están guardadas." | Reintentar |
| Validación (la salida de la IA no pasa el catálogo ni los topes tras los reintentos; guardarraíl 2) | "No ha salido bien" | "No hemos podido montar un plan seguro con estas opciones. No hemos guardado nada y este intento no cuenta." | Reintentar y Revisar mis respuestas |
En el check-in, el texto de validación dice "ajuste" en lugar de "plan", y la acción secundaria es "Mantener mi plan". El servidor devuelve el tipo de error para que la pantalla elija el texto.

### 11.8 Cuándo aparece el check-in (D10: aceptada)
Fila en Hoy, con etiqueta PREMIUM, desde que termina la última sesión planificada de la semana (o desde el domingo si quedan sesiones sin hacer) hasta el domingo a medianoche.
| Estado | Lo que se ve en Hoy |
|---|---|
| No toca todavía | Nada |
| Disponible | "Check-in de la semana" con flecha |
| Ya hecho | "Check-in hecho. Ver tu ajuste" (abre el resultado guardado; no hace otra llamada a la IA) |
| Sin premium (prueba terminada) | La misma fila con candado; lleva a "¿CONTINUAR?" |
| Semana sin sesiones | Disponible el domingo; dentro, el estado vacío "Aún no hay partida" |

### 11.9 Vuelta de Stripe Checkout (D11: aceptada)
Pantalla de vuelta, cabecera normal, sin barra de pestañas. Consulta `subscription_status` mientras espera.
| Estado | Lo que se ve |
|---|---|
| Esperando el webhook | "Activando premium…", barra por segmentos; hasta 30 s |
| Hecho | Pop "PREMIUM ACTIVADO" y vuelta a donde estaba (por ejemplo, el check-in) |
| Cancelado en Stripe | "No se ha hecho ningún cargo." y vuelta |
| Fallido o espera agotada | "No hemos podido confirmar el pago." Si Stripe devolvió un pago fallido: "Reintentar". Si se agotó la espera: "Si ves el cargo en tu banco, no vuelvas a pagar: premium se activará en unos minutos." y "Volver a Hoy" |
Nota: en el caso de espera agotada no se ofrece "Reintentar", para no provocar un segundo cargo mientras el primero aún se está confirmando.

### 11.10 Paso entre ejercicios (D12: aceptada)
Tras la última serie de un ejercicio (y tras el pop "EJERCICIO HECHO"), pantalla de paso dentro de la sesión, con el mismo marcador:
- Etiqueta "SIGUIENTE", título con el ejercicio ("REMO SENTADO"), la máquina y lo que toca: peso precargado y series ("45 kg, 3 series de 8 a 12").
- El contador de descanso sigue corriendo, sin alarma.
- CTA "Empezar" y botón secundario "Cambiar ejercicio" (abre las mismas alternativas, por si la máquina está ocupada).
- Tras el último ejercicio no hay paso: va directo al fin de sesión (D7).

### 11.11 Guion del recorrido (pasada 3)
| Paso | El usuario hace | Siente | ¿Qué lo cubre? |
|---|---|---|---|
| 1 | Abre BUDDY por primera vez | Curiosidad, "¿esto es para mí?" | Bienvenida con logotipo y promesa; aviso médico (✓) |
| 2 | Elige foco, experiencia, días, deportes | "Me está escuchando" | Foco (✓); experiencia, disponibilidad y deportes **sin diseñar** |
| 3 | Marca su gimnasio | "Conoce mi gimnasio" | Mi gimnasio (✓) |
| 4 | Crea la cuenta (18+) y confirma el email | Fricción, dudas de dar datos | **Sin diseñar** (punto de abandono, docs/04) |
| 5 | Da el consentimiento de salud | Desconfianza | **Sin diseñar**, ni su salida |
| 6 | Marca limitaciones y responde el cribado | Vulnerable | Cribado (✓ con D6); limitaciones **sin diseñar**; bloqueo (✓) |
| 7 | Revisa el resumen y genera el plan | Expectativa, espera de 10 a 30 s | Resumen **sin diseñar**; carga y errores (✓ D9) |
| 8 | Ve su plan | Primer momento de valor | Plan recién generado (✓ D4) |
| 9 | Calibra en la primera sesión | Inseguridad: "¿lo hago bien?" | Calibración (✓) |
| 10 | Entrena días 2 y 3 | Competencia, rutina | Hoy (D3), sesión, paso entre ejercicios (D12), fin de sesión (D7) |
| 11 | Siente una molestia dos sesiones seguidas | Preocupación | Primera vez (✓); **la segunda vez, sin diseñar** |
| 12 | Cierra la semana con el check-in | "Me entiende" | Check-in (✓ D10) |
| 13 | Cambia limitaciones o equipo | Control | **Ajustes sin diseñar** |
| 14 | Termina la prueba (día 14) | Decisión de pago | "¿CONTINUAR?" (✓) y vuelta de Stripe (✓ D11) |

Horizontes: en 5 segundos, la marca y la promesa (bien). En 5 minutos, el wizard hasta el plan (le faltan 7 pantallas). Con los años, el peso que sube semana a semana, el fin de sesión y el progreso (cubiertos).

### 11.12 Pantallas del wizard que faltaban (D13: aceptada)
Todas usan el marcador con la barra de progreso de 11 segmentos, "← Atrás", una pregunta por pantalla y el CTA "Siguiente" abajo. Contenido según PRD §5.
| # | Pantalla | Título del marcador | Componente | Detalle |
|---|---|---|---|---|
| 3 | Experiencia | "TU EXPERIENCIA" | Tarjetas de selección única con icono | Nunca he entrenado con máquinas; Menos de 6 meses; De 6 meses a 2 años; Más de 2 años. Nada preseleccionado; Siguiente se activa al elegir |
| 4 | Disponibilidad | "TU SEMANA" | Dos grupos segmentados grandes (48 px) | "¿Cuántos días?" 2, 3, 4, 5. "¿Cuánto tiempo por sesión?" 30, 45, 60, 75 o más minutos. Debajo, en vivo: "Te montamos cuerpo completo" (2 o 3 días) o "torso y pierna alternos" (4 o 5) |
| 5 | Otros deportes | "TUS DEPORTES" | Chips de selección múltiple + "Ninguno" | Pádel, correr, natación, clase dirigida, bici… Opcional: el CTA dice "Saltar" sin selección y "Siguiente" con ella |
| — | Registro | "TU CUENTA" | Campos con etiqueta visible (nunca solo el placeholder) | Email, contraseña (con botón de mostrar), casilla sin marcar "Tengo 18 años o más". Línea de confianza: "Tus respuestas se guardan en tu cuenta. Aún no te pedimos nada de salud." Errores en línea bajo cada campo ("Ese email ya tiene cuenta. Entrar") |
| — | Revisa tu correo | "REVISA TU CORREO" | Vacío con marca de agua | "Te hemos enviado un enlace a p…@…. Ábrelo para seguir." "Reenviar" (desactivado 60 s, con cuenta atrás) y "Cambiar email" |
| 7 | Consentimiento | "TUS DATOS DE SALUD" | Texto corto + casilla sin marcar | Qué datos (limitaciones y cribado), para qué (generar y ajustar tu plan), que la IA de Anthropic los procesa fuera de la UE sin datos de salud en los prompts (D29), y cómo retirarlo (Ajustes). Siguiente desactivado hasta marcar. La salida, en D14 |
| 8 | Limitaciones | "TUS LIMITACIONES" | Chips de selección múltiple + "Ninguna" (exclusiva) | Hombro, codo, muñeca, cuello o espalda alta, espalda baja, cadera, rodilla, tobillo. Sin texto libre. Si el cribado articular dice "Sí" y no hay ninguna zona, aviso "Marca la zona que te molesta" y Siguiente desactivado |
| 10 | Resumen | "TODO LISTO" | Lista de reglas de imprenta, una fila por respuesta con "Cambiar" | Foco, experiencia, semana, deportes, gimnasio, limitaciones. El cribado no se muestra (solo "Seguridad: respondida"). CTA "Generar mi plan" |
Orden real del flujo: Bienvenida, Foco, Experiencia, Disponibilidad, Deportes, Mi gimnasio, Registro, Revisa tu correo, Consentimiento, Limitaciones, Cribado, Resumen, Generando, Plan. "Ir a limitaciones" desde el cribado vuelve a la pantalla 8.

### 11.13 Salida sin consentimiento (D14: aceptada)
- En la pantalla de consentimiento, bajo el CTA, un enlace: "No quiero dar estos datos".
- Lleva a una pantalla con cabecera sobria, "SIN DATOS DE SALUD": "Sin estos datos no podemos crear un plan que respete tus limitaciones. No hemos guardado nada de salud."
- Dos salidas: "Volver y aceptar" (CTA) y "Borrar mi cuenta" (enlace, con hoja de confirmación: "Se borran tu cuenta y tus respuestas. No se puede deshacer.").
- Si cierra sin elegir, la cuenta queda sin datos de salud; al volver a entrar, la app abre esta misma pantalla.

### 11.14 Pestaña Ajustes (D15: aceptada)
Lista con reglas de imprenta, en cuatro bloques con título en Archivo cursiva:
1. **Mi entreno:** Limitaciones y Mi gimnasio (al guardar, refiltrado determinista y gratis, D35, con aviso de lo que ha cambiado y de los huecos vacíos); salto de peso por máquina (PRD §10); foco y días: cambiarlos regenera el plan con IA (D26/D43): gratis, un cambio al mes; premium, sin ese límite. Antes de guardar, una hoja avisa: "Esto crea un plan nuevo. Tu historial y tus pesos se mantienen." Si ya se usó el cambio del mes: "Podrás cambiarlo a partir del 1 de diciembre" y "Hazte premium".
2. **Preferencias:** tema (claro, oscuro, como el sistema); mostrar el contador de descanso (sí por defecto, PRD §9).
3. **Suscripción:** estado ("Prueba premium: quedan 9 días", "Premium" o "Gratis") y "Gestionar" (portal de Stripe) o "Hazte premium".
4. **Cuenta y privacidad:** email; retirar el consentimiento (hoja de confirmación: "Tu plan se pausa y borramos tus datos de salud. Podrás volver a darlo."); borrar la cuenta (hoja de confirmación, no se puede deshacer); términos y aviso médico; cerrar sesión.

### 11.16 Molestia repetida (D16: aceptada)
Si el usuario pulsa "Tengo molestia" en un ejercicio que ya marcó con molestia en la sesión anterior, en lugar de la hoja normal sale esta (cabecera sobria, sin animación):
- "Es la segunda vez que el jalón al pecho te molesta. Te recomendamos consultarlo con un profesional sanitario."
- "¿Quieres añadir la zona a tus limitaciones?": chips con las zonas que carga ese ejercicio según el catálogo (por ejemplo, hombro y codo), ninguna preseleccionada.
- CTA "Añadir y ajustar mi plan" (activo al elegir una zona): guarda la limitación y refiltra gratis (D35); luego, aviso de qué ha cambiado.
- "Ahora no": el ejercicio se para hoy igualmente, sin subida de carga (guardarraíl 7).

### 11.17 Títulos con información (D17: aceptada)
El título del marcador cuenta lo que pasa, con los datos del usuario; si no cabe, ocupa dos líneas (máximo). El contexto fijo de la sección va en la etiqueta pixelada de arriba.
| Pantalla | Antes | Ahora (ejemplo) |
|---|---|---|
| Plan | TU PLAN | 3 DÍAS, CUERPO COMPLETO |
| Check-in, carga | ANALIZANDO | LEYENDO TU SEMANA |
| Check-in, resultado | TU AJUSTE | MENOS PIERNA ESTA SEMANA |
| Progreso | PROGRESO | PRENSA: +15 KG |
| Hoy | (nueva) | HOY TOCA TORSO / HOY DESCANSAS |
El título del resultado del check-in lo monta el código a partir del cambio ya validado (por ejemplo, el grupo con más cambio de series); nunca es texto libre de la IA.

### 11.18 Posición del pop (D18: Pablo elige B, el centro)
El pop arcade de "SERIE N HECHA" sigue en el centro de la pantalla, pero dura **0,6 s** (en lugar de 1,1 s) y no bloquea toques. El aviso "Deshacer" (D8) va aparte, abajo. Riesgo aceptado: durante 0,6 s tapa parte del peso. La celebración de fin de sesión (D7) mantiene su duración.

### 11.19 DESIGN.md y mapeo a shadcn (D19: aceptada)
Se crea `DESIGN.md` en la raíz del repo. Es la fuente de verdad para construir: tokens, tipografía, componentes y reglas. Este documento queda como registro de decisiones. `DESIGN.md` lleva la tabla de correspondencias con las variables de shadcn (`src/app/globals.css`):
| Variable shadcn | Claro | Oscuro |
|---|---|---|
| `--background` | `#FFF8E1` | `#120A1C` |
| `--foreground` | `#1A0F24` | `#F7F2FF` |
| `--card`, `--popover`, `--muted` | `#F3ECDA` | `#1E1330` |
| `--muted-foreground` | `#6B5E7B` | `#A99BBB` |
| `--primary` | `#FFE03A` | `#FFE03A` |
| `--primary-foreground` | `#1A0F24` | `#1A0F24` |
| `--secondary` | `#5B2A86` | `#B38CFF` |
| `--secondary-foreground` | `#FFFFFF` | `#120A1C` |
| `--accent` | `#3D1A5E` (marcador) | `#2A1A45` |
| `--destructive` | `#C2185B` | `#FF5FA2` |
| `--border`, `--input` | `#1A0F24` | `#A99BBB` |
| `--ring` | `#5B2A86` | `#FFE03A` |
| `--radius` | `4px` (y 2 y 6 px derivados) | igual |
Tokens propios añadidos: `--ok`, `--warn`, `--band-foreground-muted` y la franja. Inventario de componentes nuevos de esta revisión: barra de pestañas, aviso con Deshacer, hoja de edición de serie, campo de formulario con etiqueta visible, pantalla de paso y fila de lista con flecha.

### 11.20 Superficies del navegador (D20: aceptada)
- Foco visible (`:focus-visible`): anillo de 3 px en `--ring` (morado en claro, limón en oscuro), separado 2 px del elemento.
- Selección de texto: fondo limón, texto tinta. Cursor de escritura (`caret-color`): morado en claro y lavanda en oscuro.
- Scroll: fino, del color del borde (Chrome y Firefox); Safari para iOS mantiene el del sistema.
- `font-variant-numeric: tabular-nums` en todos los datos (peso, repeticiones, tiempos, gráficas).

### 11.21 Letra pixelada: 11 px mínimo (D21: aceptada)
Press Start 2P nunca baja de 11 px (etiquetas) y su texto es de 1 o 2 palabras ("9 DÍAS", "TORSO", "PREMIUM", "NIVEL ARRIBA"). Las celebraciones van a 14 px como mínimo. En 320 px, si una etiqueta no cabe, pasa a una segunda fila del marcador; no se reduce.

### 11.22 Alto mínimo de la sesión (D22: aceptada)
Regla comprobable: en 360×640, el peso, las repeticiones, los +/− y "Serie hecha" se ven sin hacer scroll. Para cumplirla, en este orden:
1. Marcador compacto en la sesión: etiqueta y progreso en una fila, título en una línea (con elipsis si no cabe), unos 80 px.
2. "NIVEL ARRIBA" solo en la primera serie del ejercicio; en las siguientes queda "subes 2,5" bajo el peso.
3. La guía ("Haz de 8 a 12 repeticiones…") pasa a una línea bajo el título.
4. Si aún no cabe (`@container` de alto), el descanso se mete en el marcador y los números bajan de 60 a 44 px.
Se comprueba en el prototipo y en el build con capturas a 360×640 y 375×667.

### 11.23 "Tengo molestia" en el marcador (D23: aceptada)
- Sale de la botonera y va en el marcador de la sesión, arriba a la derecha, en todas las series: botón de borde grueso con icono y el texto "Tengo molestia", de 44 px de alto como mínimo.
- Sobre el marcador se usa el magenta claro `#FF5FA2` en los dos temas (4,9:1 sobre `#3D1A5E`; 5,6:1 sobre `#2A1A45`). El `#C2185B` daría 2,4:1 y no se usa ahí.
- La botonera inferior queda en 3 botones más anchos: Cambiar ejercicio, Hacer al final y Saltar hoy.

### 11.24 Tablet y escritorio con diseño propio (D24: Pablo elige B)
| Ancho | Navegación | Contenido |
|---|---|---|
| Hasta 599 px (móvil) | Barra inferior de 4 pestañas | Una columna fluida (lo diseñado hasta ahora) |
| 600 a 1023 px (tablet) | Barra inferior | Columna centrada de 640 px como máximo; el marcador ocupa todo el ancho |
| 1024 px o más (escritorio) | **Menú lateral fijo** de 240 px a la izquierda: logotipo, las 4 secciones con icono y texto, y el estado de la suscripción abajo. Sustituye a la barra inferior | Área de contenido de 1100 px como máximo |
En escritorio:
- **Hoy:** dos columnas; a la izquierda, la sesión del día y el CTA; a la derecha, la semana, las cifras y el check-in.
- **Plan:** los días de entreno en columnas, uno al lado del otro.
- **Progreso:** las gráficas en una rejilla de dos columnas; la de peso de trabajo ocupa todo el ancho arriba.
- **Ajustes:** los 4 bloques en dos columnas.
- **Wizard, sesión, calibración, fin de sesión y vuelta de Stripe:** siguen en una columna centrada de 480 px sobre el fondo morado con trama. Son flujos de una tarea; el ancho no les aporta.
Coste aceptado: un diseño más que construir y probar antes del 20/11.

### 11.25 Lector de pantalla y teclado (D25: aceptada)
- Zonas: `header` (marcador), `main` (contenido) y `nav` (pestañas o menú lateral), con `aria-label` en español.
- Avisos en vivo: `role="status"` (educado) para "Serie 2 hecha", Deshacer, "Generando tu plan", "Plan listo" y "Premium activado"; `role="alert"` solo para errores (D9) y para el bloqueo del cribado.
- El contador de descanso lleva `aria-live="off"`: solo se lee si se enfoca. El pop arcade es decorativo (`aria-hidden`); su información va en el aviso de estado.
- Hojas inferiores: `role="dialog"` con `aria-modal`, título enlazado, foco atrapado dentro, Esc para cerrar y el foco vuelve al botón que la abrió.
- Botones con nombre completo: "Más peso, ahora 45 kg", "Tengo molestia en jalón al pecho". Iconos con `aria-hidden`. El orden del foco es el orden visual.
- Las etiquetas pixeladas se leen como texto normal (nada de mayúsculas deletreadas: el texto va en minúsculas en el HTML y en mayúsculas con CSS).
- Prueba manual con VoiceOver o TalkBack del wizard y de una sesión completa antes de la entrega (~30 min).

### 11.15 Cambiar foco o días siendo gratis (D26: aceptada; registrada como D43 en docs/01 y en PRD §14)
Gratis: un cambio de foco o de días al mes, que regenera el plan con IA (una llamada, unos 0,05 $). Premium: sin ese límite, dentro del tope general de generaciones (guardarraíl 12). El historial y los pesos calibrados se conservan; los ejercicios que siguen en el plan mantienen su progresión. La interfaz está en 11.14 (Ajustes, Mi entreno).

### 11.26 Carga de calibración (D27: aceptada)
- Cada ejercicio del catálogo lleva una **carga de calibración** baja y su **salto de máquina** por defecto (PRD §6 y §10). Ejemplos orientativos: prensa 40 kg, jalón 25 kg (los fija el catálogo semilla, no el diseño).
- Ajuste por experiencia (pantalla 3 del wizard): "Nunca he entrenado con máquinas" o "Menos de 6 meses", un salto menos; "Más de 2 años", un salto más; el resto, sin cambio. Nunca por debajo del mínimo de la máquina.
- En pantalla: "Empezamos bajo a propósito. Esta máquina sube de 5 en 5 kg." y +/− por si la máquina no tiene ese peso exacto.
- Función pura y determinista, con test (guardarraíl 3). La IA no interviene.

### 11.27 Hueco vacío con salida (D28: aceptada)
En la pestaña Plan, la fila del hueco (en `--warn`, con icono) dice el motivo y ofrece acciones:
- "Ningún ejercicio de cuádriceps encaja con tu rodilla y tu equipo."
- "Revisar Mi gimnasio" (lleva a Ajustes; quizá hay una máquina sin marcar) y, solo en premium, "Regenerar plan".
- En la sesión, el hueco no aparece: se omite sin penalizar y no cuenta como saltado.
- Nunca se propone un ejercicio que cargue una zona limitada (guardarraíl 6).

### 11.28 Precarga de la sesión y refiltrado (D29: aceptada)
- **Cargando:** al pulsar "Empezar sesión", el botón muestra la barra por segmentos y "Preparando tu sesión".
- **Error:** cabecera sobria, "Sin conexión" y Reintentar. Nunca empieza con pesos sin confirmar. El texto depende de si la cola local (orden de build 8) está construida:
  - Con la cola: "Necesitamos cargar tu sesión una vez; después funciona aunque se corte la conexión."
  - Sin la cola (guardado directo, build 3): "Necesitamos conexión para cargar y guardar tu sesión."
- **Refiltrado:** hoja con "Ajustando tu plan…" (determinista, menos de 1 s) y luego el aviso de qué ha cambiado, con los huecos vacíos si los hay (D28).

### 11.29 Avisos de la prueba de 14 días (D30: aceptada)
Todos leen la única función "es premium" (D36).
1. **Plan recién generado:** una línea bajo la pegatina: "Tienes 14 días de premium gratis: tu coach semanal te espera al acabar tu primera semana." (El texto sigue a D10, no a un día fijo.)
2. **Hoy, de forma continua:** etiqueta "9 DÍAS" junto a PREMIUM en el marcador; en Ajustes, el estado de la suscripción (D15).
3. **Día 12:** una línea en Hoy: "Te quedan 2 días de premium." con "Ver qué incluye" (lleva a "¿CONTINUAR?"). Sin emails nuevos.

### 11.30 Emails (D31: aceptada, reglas mínimas)
Reglas en `DESIGN.md` §9 (columna de 600 px, marcador con logotipo en imagen, franja, Arial o Georgia, un botón limón, una acción, sin datos de salud). El texto de cada email se cierra en el build 6.

## Fuera de alcance de esta revisión
- Maquetas generadas por IA: el diseñador de gstack no tiene clave de OpenAI ni de Gemini; la revisión se hizo sobre el prototipo HTML.
- Logotipo definitivo e ilustraciones de ejercicios: se deciden con el catálogo (abierto en DESIGN.md §10).
- Panel de admin, cola local, estancamiento, semana adaptada, sesión exprés y Pregúntale a BUDDY (después de la línea de corte): solo se reservó su sitio (D5).
- Texto exacto de los emails (build 6).

## Lo que ya existe y se reutiliza
- shadcn/ui (`base-nova`) con Lucide: los tokens se aplican por sus variables (D19), sin componentes nuevos de librería.
- `docs/diseno/prototipo.html`: referencia navegable (selector de tema, ancho y fuente) para las pantallas existentes; las nuevas de esta revisión están especificadas aquí y en `DESIGN.md`.
- Contraste ya calculado (§2), reglas anti "app genérica" (§4 bis) y regla de alto de 360×640 (D22).

## Implementation Tasks
Sintetizadas de los hallazgos de esta revisión. Estimación: humano frente a Claude Code (proporción de funcionalidades, ~30×).

- [ ] **T1 (P1, humano: ~3 h / CC: ~10 min)**: Tema: tokens de DESIGN.md en las variables de shadcn, fuentes con `next/font` y superficies del navegador
  - Surgido de: pasada 5 (D19, D20, D21)
  - Archivos: `src/app/globals.css`, `src/app/layout.tsx`
  - Verificar: botón y diálogo de shadcn salen en limón y crema; foco con anillo morado; captura en claro y oscuro
- [ ] **T2 (P1, humano: ~1 día / CC: ~30 min)**: Estructura de la app: barra de 4 pestañas (móvil y tablet) y menú lateral (≥ 1024 px), columnas por ancho
  - Surgido de: pasadas 1 y 6 (D3, D24)
  - Verificar: capturas a 360, 768 y 1280 px
- [ ] **T3 (P1, humano: ~1,5 días / CC: ~45 min)**: Wizard completo: las 7 pantallas nuevas, cribado sin respuesta por defecto y salida sin consentimiento
  - Surgido de: pasadas 2 y 3 (D6, D13, D14)
  - Verificar: no se puede pasar el cribado sin responder las 8; "No quiero dar estos datos" lleva a la salida
- [ ] **T4 (P1, humano: ~1 día / CC: ~30 min)**: Pantalla Hoy: sesión del día o descanso, fila del check-in con sus estados, avisos de la prueba y sitio reservado para premium 4 y 5
  - Surgido de: pasadas 1, 2 y 7 (D3, D5, D10, D17, D30)
- [ ] **T5 (P1, humano: ~4 h / CC: ~15 min)**: Pestaña Plan (consulta) y variante de plan recién generado; hueco vacío con motivo y acciones
  - Surgido de: pasadas 1 y 7 (D4, D17, D28)
- [ ] **T6 (P1, humano: ~2 días / CC: ~1 h)**: Sesión: marcador compacto con "Tengo molestia", 3 botones, Deshacer y edición de serie, pop de 0,6 s, paso entre ejercicios, fin de sesión, precarga y regla de 360×640
  - Surgido de: pasadas 2, 4 y 6 (D7, D8, D12, D18, D22, D23, D29)
  - Verificar: captura a 360×640 con peso, repeticiones, +/− y "Serie hecha" visibles; deshacer una serie
- [ ] **T7 (P1, humano: ~3 h / CC: ~10 min)**: Función pura de carga de calibración (catálogo + experiencia) con tests
  - Surgido de: pasada 7 (D27)
  - Archivos: módulo de reglas de carga y su `.test.ts`
  - Verificar: `npx vitest run` del módulo
- [ ] **T8 (P1, humano: ~3 h / CC: ~10 min)**: Hoja de molestia repetida con zonas del ejercicio y refiltrado
  - Surgido de: pasada 3 (D16)
- [ ] **T9 (P1, humano: ~2 h / CC: ~10 min)**: Errores de IA: el servidor devuelve el tipo (conexión o validación) y la pantalla elige el texto
  - Surgido de: pasada 2 (D9)
- [ ] **T10 (P1, humano: ~4 h / CC: ~15 min)**: Pantalla de vuelta de Stripe con sus 4 estados
  - Surgido de: pasada 2 (D11)
- [ ] **T11 (P2, humano: ~1 día / CC: ~30 min)**: Ajustes en 4 bloques, con retirar el consentimiento, borrar la cuenta y el cambio mensual de foco o días
  - Surgido de: pasadas 3 y 7 (D15, D26/D43)
- [ ] **T12 (P2, humano: ~4 h / CC: ~15 min)**: Reglas de lector de pantalla y prueba manual con VoiceOver o TalkBack
  - Surgido de: pasada 6 (D25)
- [ ] **T13 (P2, humano: ~3 h / CC: ~10 min)**: Plantilla de los 3 emails según DESIGN.md §9
  - Surgido de: cierre (D31)

## Design Review Completion Summary
```
  +====================================================================+
  |         DESIGN PLAN REVIEW — COMPLETION SUMMARY                    |
  +====================================================================+
  | System Audit         | sin DESIGN.md (creado, D19); UI: app completa|
  | Step 0               | 6/10; 7 pasadas completas                   |
  | Pass 1  (Info Arch)  | 4/10 → 8/10 after fixes                     |
  | Pass 2  (States)     | 5/10 → 9/10 after fixes                     |
  | Pass 3  (Journey)    | 4/10 → 9/10 after fixes                     |
  | Pass 4  (AI Slop)    | 7/10 → 9/10 after fixes                     |
  | Pass 5  (Design Sys) | 6/10 → 9/10 after fixes                     |
  | Pass 6  (Responsive) | 6/10 → 9/10 after fixes                     |
  | Pass 7  (Decisions)  | 8 resolved, 0 deferred                      |
  +--------------------------------------------------------------------+
  | NOT in scope         | written (4 items)                           |
  | What already exists  | written                                     |
  | TODOS.md updates     | 0 items proposed                            |
  | Approved Mockups     | 0 generated, 0 approved (sin clave)         |
  | Decisions made       | 29 added to plan (D3–D31)                   |
  | Decisions deferred   | 0                                           |
  | Overall design score | 4/10 → 8/10                                 |
  +====================================================================+
```
Lo que impide el 10: pasada 1, que ninguna pantalla nueva está aún en el prototipo (Hoy, fin de sesión, paso, wizard, Ajustes) y se verificará en el build; pasadas 2 a 6, la prueba manual con lector de pantalla (T12) y las capturas de verificación de T2 y T6. Segunda opinión: subagente de Claude (mismo modelo; Codex no instalado), sin revisión externa.

### Unresolved Decisions
Ninguna. Abiertos fuera de esta revisión: logotipo definitivo e ilustraciones de ejercicios (DESIGN.md §10).

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | ISSUES OPEN (28/10, según docs/04) | mode: SCOPE_REDUCTION, 1 critical gap |
| Outside Review | subagente nativo de Claude (Codex no instalado) | Independent 2nd opinion | 1 | unavailable (externo) | 6 críticos, 5 altos, 7 medios (nativos); integrados en D3–D31 |
| Eng Review | `/autoplan` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR | score: 4/10 → 8/10, 29 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **OUTSIDE COVERAGE:** codex, fase de diseño, no instalado: no hay revisión externa completada. El respaldo nativo (subagente de Claude, mismo modelo) completó con 18 hallazgos, integrados en las pasadas.
- **VERDICT:** Design Review CLEAR. CEO Review con un gap abierto (cron sin rastro, asignado a ingeniería). Eng review required.

NO UNRESOLVED DECISIONS
