# DESIGN.md — BUDDY

Fuente de verdad del diseño para construir. Decisiones y su porqué: `docs/diseno/sistema-de-diseno.md` (§11: revisión de diseño del 12/11, D3–D31) y `docs/01-contexto-y-criterios.md` (D38–D43). Prototipo de referencia: `docs/diseno/prototipo.html`.

## 1. Dirección
"Venice 89 × arcade": la cultura de gimnasio de Los Ángeles de los 80 y 90 (púrpura y oro) y los videojuegos retro, en una app moderna y amable. Uso con una mano, con la luz del gimnasio.
- Lo retro va en los guiños (marcador, trama, franja, celebraciones). La zona de datos (peso, repeticiones) siempre queda limpia.
- La seguridad nunca se gamifica: Molestia, bloqueo del cribado y errores van con la cabecera sobria, sin animación.
- Nada de aspecto de app genérica hecha con IA: sin puntos medios ni guiones como separadores en la UI, sin píldoras ni radios grandes, sin cajas con cabecera sombreada, sin emojis, sin barras laterales de color. Los títulos de pantalla cuentan lo que pasa, con datos ("3 DÍAS, CUERPO COMPLETO").

## 2. Tokens → variables de shadcn (`src/app/globals.css`)
| Variable | Claro | Oscuro | Uso |
|---|---|---|---|
| `--background` | `#FFF8E1` | `#120A1C` | Fondo (papel crema / noche) |
| `--foreground` | `#1A0F24` | `#F7F2FF` | Texto principal |
| `--card`, `--popover`, `--muted` | `#F3ECDA` | `#1E1330` | Superficies (solo datos de la sesión, campos, hojas) |
| `--muted-foreground` | `#6B5E7B` | `#A99BBB` | Texto de apoyo |
| `--primary` | `#FFE03A` | `#FFE03A` | Limón: CTA, selección, progreso |
| `--primary-foreground` | `#1A0F24` | `#1A0F24` | Texto sobre limón |
| `--secondary` | `#5B2A86` | `#B38CFF` | Acciones secundarias, marcas de gráficas |
| `--secondary-foreground` | `#FFFFFF` | `#120A1C` | |
| `--accent` | `#3D1A5E` | `#2A1A45` | Marcador (cabecera) |
| `--destructive` | `#C2185B` | `#FF5FA2` | Molestia y errores. Sobre el marcador, siempre `#FF5FA2` |
| `--border`, `--input` | `#1A0F24` | `#A99BBB` | Bordes de 2 px |
| `--ring` | `#5B2A86` | `#FFE03A` | Anillo de foco de 3 px |
| `--ok` | `#0E7C72` | `#2ED3C1` | Hecho, sincronizado, calibración (en claro, no en texto pequeño) |
| `--warn` | `#B54708` | `#FF9F45` | Sin sincronizar, hueco vacío, fin de la prueba |
| `--radius` | 4 px | 4 px | Derivados: 2 px (pequeño), 6 px (tarjetas, CTA, hojas) |
Franja decorativa de 8 px bajo el marcador: limón, `#FF5FA2`, `#2ED3C1` en bloques de 40 px.

**Reglas duras de color:** el limón nunca va como texto, icono ni borde sobre fondo claro (1,3:1); solo de relleno con tinta encima o sobre el marcador. Los colores de estado siempre van con icono y texto. Todos los pares de texto cumplen AA (4,5:1); los números de la sesión, AAA (7:1).

## 3. Tipografía (`next/font`, Google Fonts, OFL)
| Rol | Fuente | Regla |
|---|---|---|
| Títulos, números grandes, CTA | Archivo, anchura 125 %, 900 cursiva | Mayúsculas en títulos y CTA; cifras tabulares |
| Cuerpo y controles | Atkinson Hyperlegible Next 400–800 | Cuerpo de 15–16 px. Su cero lleva barra: las cifras de datos van en Archivo |
| Etiquetas y celebraciones | Press Start 2P | **Mínimo 11 px**, 1 o 2 palabras; celebraciones de 14 px como mínimo |
Escala: 12, 13, 14, 15, 17, 20, 24, 28 (título; con `clamp()` de 22 a 32), 44–60 (peso y repeticiones), 46–72 (logotipo).

## 4. Espacio, forma y tacto
- Espaciado en múltiplos de 4. Margen lateral `clamp(14px, 5cqi, 22px)`.
- Bordes de 2 px en tinta y sombra dura de 4–5 px en morado, sin desenfoque (botón de recreativa: se hunde al pulsar).
- Área táctil de 44 px como mínimo; 48 px en la sesión; 60 px el CTA. Acciones principales en la mitad inferior.
- Las listas usan reglas de imprenta (título en Archivo cursiva con filete de 3 px y líneas finas entre filas), no tarjetas. Un único elemento destacado por pantalla (pegatina limón girada o banner "NIVEL ARRIBA").

## 5. Navegación y ancho
| Ancho | Navegación | Contenido |
|---|---|---|
| ≤ 599 px | Barra inferior de 56 px: Hoy, Plan, Progreso, Ajustes (activa: barra limón arriba) | Una columna fluida (`container-type: inline-size`) |
| 600–1023 px | Barra inferior | Columna centrada de 640 px como máximo |
| ≥ 1024 px | Menú lateral fijo de 240 px (logotipo, 4 secciones, estado de la suscripción) | 1100 px como máximo; Hoy en 2 columnas, Plan con un día por columna, Progreso en rejilla de 2, Ajustes en 2 columnas |
El wizard, la sesión, la calibración, el fin de sesión y la vuelta de Stripe no llevan barra: van en una columna de 480 px como máximo, sobre el fondo morado con trama en pantallas anchas.

**Regla de alto:** en 360×640, el peso, las repeticiones, los +/− y "Serie hecha" se ven sin scroll (marcador compacto de la sesión, "NIVEL ARRIBA" solo en la primera serie y números de 44 px si hace falta).

## 6. Componentes
Marcador (normal, sobrio, calibración, compacto de sesión), barra de progreso por segmentos, CTA primario, botón secundario, enlace, tarjeta de selección única con icono propio, chip de selección múltiple (con "Ninguna" exclusiva), Sí/No segmentado sin valor por defecto, stat grande con +/−, escala 1–5, aviso (info, ok, warn, danger), hoja inferior, etiqueta pixelada, pop arcade, aviso breve con Deshacer, fila de lista con flecha, campo de formulario con etiqueta visible, barra de pestañas y menú lateral, pantalla de paso entre ejercicios, vacío con marca de agua, pegatina.
Iconos: propios, de trazo de 2,5 px con terminación cuadrada; Lucide solo si encaja con ese trazo.

## 7. Movimiento
A saltos (`steps()`), como los sprites. Pop de serie: 0,6 s, en el centro y sin bloquear toques. Celebraciones de peso fijado, "NIVEL ARRIBA", fin de sesión y premium activado: 1,1 s como máximo. Sin animación en Molestia, bloqueo, errores ni avisos de seguridad. `prefers-reduced-motion` deja todo estático.

## 8. Accesibilidad
- Zonas `header`, `main` y `nav` con nombre. `role="status"` para serie hecha, Deshacer, carga y resultados; `role="alert"` solo para errores y el bloqueo del cribado. Descanso con `aria-live="off"`. Pop con `aria-hidden`.
- Hojas: `role="dialog"`, `aria-modal`, foco atrapado, Esc para cerrar y el foco vuelve al origen.
- Botones con nombre completo ("Más peso, ahora 45 kg"); iconos con `aria-hidden`; orden de foco igual al visual. Texto en mayúsculas solo por CSS.
- Navegador tematizado: `:focus-visible` con anillo de 3 px en `--ring` y separación de 2 px; `::selection` limón con tinta; `caret-color` morado (lavanda en oscuro); scroll fino del color del borde; `tabular-nums` en datos.
- Prueba manual con VoiceOver o TalkBack del wizard y una sesión antes de entregar.

## 9. Emails (Resend)
Columna de 600 px; marcador morado con el logotipo como imagen y la franja; Arial (o Georgia) como fuente; un único botón limón con tinta; un asunto claro y una sola acción por email; nunca datos de salud. El texto de cada uno se cierra al construirlos (build 6).

## 10. Abierto
Logotipo definitivo (provisional: "BUDDY" en Archivo 900 cursiva, limón con sombra magenta). Estilo de las ilustraciones de ejercicios (se decide con el catálogo).
