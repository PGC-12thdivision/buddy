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
