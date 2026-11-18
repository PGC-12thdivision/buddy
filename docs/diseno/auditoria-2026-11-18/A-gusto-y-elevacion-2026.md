# Auditoría de diseño A: BUDDY (18/11/2026)

Material revisado: `DESIGN.md`, `docs/diseno/sistema-de-diseno.md` (§1–§6, §11), `docs/diseno/prototipo.html` (CSS y pantallas Plan y Sesión), `globals.css`, `wizard/ui.tsx`, `app/screen.tsx`, `nav/app-nav.tsx`, páginas de `(wizard)` y `(app)`, capturas m-, t- y d-. Criterio externo: Taste Skill (system.md, motion, moments) y los DESIGN.md de nintendo-2001, nike, playstation y raycast.

**Límites de la auditoría (léelos antes):**
- Las 5 capturas `proto-*.png` son el mismo archivo (mismo hash) y muestran la pantalla de la app "Sin datos de salud" a 1400 px, no el prototipo. He comparado contra el CSS y el HTML del prototipo, no contra capturas.
- `m-seguridad.png` es idéntica a `m-limitaciones.png` (el cribado redirigió). El cribado no está auditado visualmente.
- La píldora naranja "N 1 Insight" de todas las capturas es una herramienta del navegador, no de la app. La ignoro.
- La skill image-to-code no está en el repo de Taste Skill (el README dice que se movió a `Leonxlnx/imagegen-skills`), así que no la he usado.
- Taste Skill está pensada para webs de marketing: sus reglas "nunca violeta" y "nunca botón con sombra" chocan de frente con el ADN de BUDDY. Las trato como excepción de marca deliberada, no como hallazgos.
- No he visto el tema oscuro ni la sesión (aún no está construida).

---

## Veredicto en 5 líneas

1. **Funciona:** el marcador morado con trama, la franja de 3 colores, el título Archivo 125 % en cursiva limón y el CTA de recreativa con sombra dura forman una identidad propia que se reconoce en cualquier captura. No parece una plantilla de shadcn.
2. **Funciona:** la disciplina del sistema (bordes de 2 px, radios de 4 a 6 px, reglas de imprenta en Plan y Resumen, títulos con datos) se aplica con constancia en el wizard.
3. **Huele a demo:** las pantallas de la app (Hoy, Ajustes, Progreso) son una cabecera bonita sobre una lista gris. No hay ningún dato protagonista, ningún número grande ni momento de juego, y en escritorio son 1000 px de filas con la etiqueta a un lado y el valor al otro.
4. **Huele a genérico:** el código se quedó con la versión anterior a la pasada "anti app genérica" del prototipo (§4 bis). Tarjetas rellenas, avisos en caja, ✓ tipográfico y casilla nativa con radio. Son justo las señales que el prototipo ya había quitado.
5. **Huele a sin terminar:** el pie fijo corta el contenido con un borde seco (Registro, Resumen). La etiqueta pixelada escribe "DíAS" y "SESIóN". Faltan las 2 columnas de Hoy en escritorio que pide D24. El CTA de escritorio mide 1000 px.

---

## Hallazgos priorizados

### P1: alto impacto

**P1.1 Las tildes salen mal en la letra pixelada ("DíAS", "SESIóN")**
- Pantallas: Hoy (m-hoy, t-hoy, d-hoy: etiqueta "14 DíAS"), Plan (m-plan, d-plan: pegatina "PRIMERA SESIóN").
- Qué pasa: las mayúsculas con tilde de Press Start 2P salen como minúscula o con otro diseño. Las etiquetas pixeladas son el guiño más visible y salen con una errata.
- Por qué importa: es el primer sitio donde mira el usuario en Hoy y en Plan, y en una app en español una errata tipográfica en la marca le quita credibilidad. No puedo confirmar la causa exacta: puede faltar el glifo `Í`/`Ó` en el subset o que la fuente lo dibuje así.
- Propuesta: (a) Comprueba en un HTML aislado con "ÍÓÁÉÚÑ" en Press Start 2P, `subsets: ["latin","latin-ext"]`. (b) Si la fuente no tiene buenas mayúsculas con tilde, cambia la fuente pixelada por **Silkscreen** o **Pixelify Sans** (OFL, Google Fonts, con Latin-1 completo). Prueba la que respete el mínimo de 11 px con el mismo ancho visual. (c) Como parche hasta decidirlo, elige etiquetas sin tilde ("1ª SERIE", "PLAN LISTO", "14 DIAS" no vale: mejor "QUEDAN 14").
- **CAMBIA DESIGN.md** si se cambia la fuente (§3, fila "Etiquetas y celebraciones").

**P1.2 El pie fijo corta el contenido con un borde seco**
- Pantallas: Registro (m-registro: la casilla "Tengo 18 años o más" queda cortada por el CTA), Resumen (m-resumen: "Rodilla" cortada), Foco (m-foco: "Perder grasa" bajo el CTA), Hoy (m-hoy).
- Qué pasa: `.wz-foot` es `position: sticky` con el mismo fondo crema y nada que lo separe. El texto se corta a media línea y parece un fallo de maquetación, no algo que sigue al hacer scroll.
- Por qué importa: en 360×640, el pie (60 px de CTA, 30 px de pie y la barra de 56 px en la app) se come casi un 25 % de la pantalla. Si además corta el contenido sin aviso, el usuario no sabe que puede bajar (la casilla de mayoría de edad es obligatoria).
- Propuesta (respeta DESIGN.md):
  ```css
  .wz-foot { padding-top: 20px; background: linear-gradient(to bottom, transparent, var(--background) 16px); }
  /* o, más "imprenta": */
  .wz-foot { border-top: 2px solid var(--foreground); }
  ```
  En Registro, pon la casilla de 18 años **antes** de la contraseña o deja que el CTA solo se fije cuando el formulario no quepa (`@container (min-height: …)`).

**P1.3 El código se quedó con los componentes de antes de la pasada "anti app genérica"**
- Pantallas: Foco, Experiencia y Gimnasio (tarjetas rellenas `#F3ECDA`), Hoy y Registro (avisos en caja con borde y radio), Deportes y Limitaciones (✓ tipográfico), Registro y Consentimiento (casilla nativa).
- Qué pasa: el prototipo corrige todo esto en su CSS final (`prototipo.html` líneas 295, 312 y 345): `.card{background:transparent}`, `.note{border:0;border-top:2px solid;border-bottom:2px solid;border-radius:0}` y un marcador propio en vez de ✓. `globals.css` copió la versión anterior: `.wz-card{background:var(--card)}`, `.wz-note{border:2px solid;border-radius:4px}` y `.wz-chip[aria-pressed=true]::before{content:"✓ "}`. Además, sistema §4 bis dice: "Las únicas cajas con relleno son los datos de la sesión".
- Por qué importa: la pila de 4 tarjetas beis con borde de tinta es, precisamente, el patrón de "lista de opciones de app hecha con IA". Con fondo transparente, la tarjeta seleccionada (limón con sombra) gana mucho más contraste y el wizard se ve más limpio.
- Propuesta (respeta DESIGN.md y el prototipo):
  ```css
  .wz-card { background: transparent; }
  .wz-note { border: 0; border-block: 2px solid var(--secondary); border-radius: 0; padding: 10px 0; }
  .wz-chip[aria-pressed="true"]::before { content: ""; display: inline-block; width: 10px; height: 5px;
    border-left: 2.5px solid currentColor; border-bottom: 2.5px solid currentColor;
    transform: rotate(-45deg); margin: 0 8px 3px 0; }
  ```
  Casilla: `appearance:none; size:24px; border:2px solid var(--foreground); border-radius:2px;` y, marcada, `background: var(--secondary)` con el mismo marcador cuadrado en blanco.

**P1.4 Hoy no tiene protagonista: es una lista con un botón**
- Pantallas: m-hoy, t-hoy, d-hoy.
- Qué pasa: la pantalla que más se va a abrir enseña un aviso, "6 EJERCICIOS" y 6 filas con "3 series" en gris de 14 px. No hay ningún número grande, ni semana, ni progreso. El prototipo de Plan tenía la tira de la semana (L M X J V S D) y "Semana 1" en el marcador, y la app no los tiene.
- Por qué importa: la promesa es "cada día, el peso que toca", y Hoy no enseña ni un peso ni un número. Es lo que más delata la demo. Las referencias (Nike: un tamaño enorme y lo demás callado; PlayStation: un momento editorial por capítulo) coinciden: una pantalla, una cifra.
- Propuesta (respeta DESIGN.md: "números grandes" en Archivo, "un único elemento destacado"):
  - Bajo la franja, una fila de 2 stats en Archivo 900 cursiva de 44 a 60 px: **6** ejercicios y **45** minutos. Etiqueta pequeña encima, sin caja (reglas de imprenta).
  - Tira de la semana de 7 casillas cuadradas de 2 px: los días de entreno en tinta, hoy en limón con borde de tinta y los hechos en `--ok` con marcador. Es "el mapa de niveles".
  - Filas de ejercicio con número de orden en Archivo cursiva (01, 02…) a la izquierda, como los cambios numerados del coach (§4 bis).
  - En escritorio, las 2 columnas que pide D24: sesión y CTA a la izquierda; semana y cifras a la derecha.

**P1.5 Escritorio: el contenido se estira hasta 1000 px**
- Pantallas: d-hoy (filas de 1000 px y un CTA de 1000 px), d-ajustes ("Suscripción" y su valor separados por 900 px), d-plan (la columna de reps parte "3 series de 8 a 12 reps" en 2 líneas).
- Qué pasa: `AppScreen` no limita la medida y Hoy no tiene su versión de 2 columnas.
- Por qué importa: un CTA de 1000 px deja de parecer un botón de recreativa y se lee como una barra. Una fila con la etiqueta y el valor tan separados obliga a cruzar la pantalla con la vista (Taste Skill: 62 caracteres de medida como máximo).
- Propuesta: `main` con `lg:max-w-[1100px]` y rejilla `lg:grid-cols-[minmax(0,1fr)_360px]` en Hoy. El CTA de la app en escritorio, con `lg:max-w-[420px]` y alineado con su columna. En Ajustes, las 2 columnas de D24 y las filas con `max-w-[560px]`.

**P1.6 El indicador de la pestaña activa incumple la regla del limón**
- Pantallas: m-progreso, m-ajustes, t-hoy (barra limón de 4 px sobre crema).
- Qué pasa: `app-nav.tsx` pinta `bg-primary` sobre `bg-background` (crema). Es justo lo que prohíbe la regla dura de §2 ("el limón nunca va como borde sobre fondo claro", 1,3:1). El propio DESIGN.md §5 lo pide ("activa: barra limón arriba"), así que el documento se contradice.
- Por qué importa: en la luz del gimnasio, la pestaña activa casi no se distingue. Solo cambia el color del texto de gris a tinta.
- Propuesta: pestaña activa con fondo limón en toda la celda, texto e icono en tinta y un borde superior de tinta de 2 px (el mismo patrón que el menú lateral de escritorio, que ya lo hace bien). Otra opción: barra de 4 px en `--secondary`. **CAMBIA DESIGN.md** §5 (para resolver la contradicción).

### P2: impacto medio

**P2.1 El CTA desactivado parece una opción más**
- Pantallas: m-experiencia, m-gimnasio, m-semana, m-limitaciones, m-registro.
- Qué pasa: `.wz-cta:disabled` usa el mismo fondo `--card` y el borde gris que las tarjetas sin elegir. Debajo de 4 tarjetas, "SIGUIENTE" parece la quinta opción.
- Propuesta: `background: transparent; border: 3px dashed var(--muted-foreground);` y la misma tipografía. El guion es el lenguaje de "aún no" que ya usa el prototipo en `.pe` y `.lock`. Respeta DESIGN.md.

**P2.2 La columna del wizard en escritorio parece un móvil olvidado en medio**
- Pantallas: d-bienvenida, d-foco, el falso proto-inicio (sin-datos a 1400 px).
- Qué pasa: hay una columna crema de 480 px pegada arriba y abajo sobre trama morada, sin borde ni sombra. En la bienvenida, dos tercios de la pantalla son trama vacía.
- Propuesta (respeta D24): enmarca la columna como el `.phone` del prototipo, como un mueble de recreativa: `border: 3px solid var(--foreground); box-shadow: 8px 8px 0 var(--secondary);`, margen vertical de 32 px a partir de 1024 px de ancho y 800 px de alto, y el marcador con `border-radius: 6px 6px 0 0`. Opcional en la bienvenida: la "B" de marca de agua gigante (Archivo 900, limón al 8 %) recortada en la trama de la derecha. Es una ampliación menor de §5: **CAMBIA DESIGN.md** solo por la marca de agua fuera de la columna.

**P2.3 La columna de reps del plan se parte y baila**
- Pantallas: m-plan, t-plan, d-plan.
- Qué pasa: "3 series de 8 a 12 reps" pasa a 2 líneas con cortes distintos según la fila ("3 series de 8 a / 12 reps"). La columna derecha baila y el ojo no puede comparar.
- Propuesta: el dato en 2 líneas fijas y alineado a la derecha: arriba "3 series" (Archivo 700, 15 px, `tabular-nums`) y abajo "8 a 12 reps" (13 px, gris). En la fila, `grid-template-columns: 1fr auto` y `white-space: nowrap` en el dato. Respeta DESIGN.md.

**P2.4 Nada responde al puntero ni entra en escena**
- Pantallas: todas, sobre todo en escritorio y tablet.
- Qué pasa: solo el CTA tiene `:active`. Las tarjetas, los chips, las filas y la navegación no tienen `:hover` ni `:active`, y el título del marcador aparece sin entrada.
- Por qué importa: Taste Skill (regla 5 y motion.md) lo pone como mínimo de calidad: los botones dan un paso al pasar por encima y se hunden al pulsar. En una app arcade, la respuesta física es la mitad de la estética.
- Propuesta (respeta DESIGN.md §7, `steps()` y `prefers-reduced-motion`):
  ```css
  @media (hover: hover) {
    .wz-card:hover, .wz-chip:hover { transform: translate(-2px,-2px); box-shadow: 2px 2px 0 var(--secondary); transition: transform .08s steps(2), box-shadow .08s steps(2); }
    .wz-cta:hover:not(:disabled) { transform: translate(-1px,-1px); box-shadow: 6px 6px 0 var(--secondary); }
  }
  .wz-card:active, .wz-chip:active { transform: translate(2px,2px); box-shadow: none; }
  .wz-title { animation: title-in .24s steps(3) both; } /* de translateX(-8px) y opacity 0 a 0 y 1 */
  ```
  Nunca en el marcador sobrio (`[data-sober]`).

**P2.5 La escala de texto pequeño queda floja y apagada**
- Pantallas: Disclaimer (12 px en todas), subtítulo del marcador (13–14 px `--band-muted`), "X de 11" (13 px), etiquetas de la barra inferior (12 px gris).
- Qué pasa: hay mucho texto de 12–13 px en gris, y en la luz del gimnasio se pierde. Taste Skill fija 13 px como mínimo absoluto.
- Propuesta: Disclaimer a 13 px. Subtítulo del marcador a 15 px. Etiqueta inactiva de la barra a 12 px, pero en `--foreground` al 70 % en vez de `--muted-foreground`. DESIGN.md ya tiene 13 y 15 en su escala, así que lo respeta.

**P2.6 Ajustes y Progreso vacíos parecen inacabados**
- Pantallas: m-ajustes, d-ajustes (una fila y un enlace), m-progreso.
- Qué pasa: Ajustes tiene 1 de los 4 bloques de D15. Progreso vacío está bien resuelto (título, frase y acción), pero la "B" de marca de agua al 6 % sobre crema se lee como una mancha.
- Propuesta: hasta que lleguen los bloques, enseña los 4 títulos de D15 con reglas de imprenta y, dentro, "Llega pronto" en gris. Mejor una estructura completa que un hueco. En Progreso vacío, una cuadrícula de 7 casillas de semana vacías (pista de lo que vendrá) en vez de la marca de agua sola. Respeta DESIGN.md.

**P2.7 Faltan "Atrás" en 2 pasos del wizard**
- Pantallas: m-limitaciones ("8 de 11", sin Atrás) y m-resumen ("10 de 11", sin Atrás).
- Qué pasa: puede ser a propósito (después del registro), pero sin Atrás la cabecera queda descompensada (solo hay número a la derecha) y el usuario no tiene salida a la vista. Comprueba con Pablo si es intencionado. Si lo es, ocupa ese hueco con la etiqueta pixelada "CUENTA OK" para equilibrar la fila.

### P3: detalle

- **P3.1 Etiqueta premium con color fijo en el código** (`screen.tsx`: `style={{ background: "#b38cff" }}`). Pásalo a un token `--tag-premium` en `globals.css`. Así se puede tematizar y se respeta DESIGN.md §2.
- **P3.2 Iconos de aviso en letra** ("i" y "!" en `Note`). Cámbialos por iconos propios de trazo de 2,5 px (círculo con i, triángulo con !), como pide §6 "iconos propios".
- **P3.3 La sombra de la tarjeta seleccionada se sale de la columna** en 360 px (m-foco: 4 px a la derecha, muy pegada al borde). Pon `margin-right: 4px` en el grupo o reduce la sombra a 3 px por debajo de 380 px de contenedor.
- **P3.4 La pegatina limón de Plan está bien, pero lleva demasiado texto** (3 frases y la etiqueta). Deja "Es de calibración" y pasa la línea de la prueba de 14 días a un aviso aparte o a la etiqueta "14 DÍAS". Es la regla de un destacado por pantalla con una sola idea.
- **P3.5 El logotipo provisional del menú lateral** (40 px con sombra magenta de 3 px) es más fino que el de la bienvenida (5 px). Iguala la proporción de la sombra (≈ 7 % del cuerpo).
- **P3.6 Contenido, no diseño, pero se ve:** los 3 días del plan empiezan por "Gemelo en máquina". Parece generado y poco profesional (un aislamiento antes que el compuesto). Revisa el orden de los huecos en la plantilla o en el prompt. No lo resuelve el diseño.
- **P3.7 La trama del marcador** (`radial-gradient` limón al 22 % con máscara a 115°) queda bien en móvil. En escritorio, a 1280 px, se queda en una esquina y la cabecera parece plana. Ajusta la máscara a `linear-gradient(100deg, transparent 55%, #000)` a partir de `lg`.

---

## Direcciones de elevación 2026

Las tres conservan: el marcador morado con trama de puntos, la franja limón, rosa y turquesa, Archivo 125 % cursiva, la sombra dura que se hunde, la letra pixelada solo en etiquetas y celebraciones, la seguridad sobria y la zona de datos limpia.

### A. "HUD de recreativa" (más arcade)
La app como interfaz de juego: tu semana es un mapa de niveles y cada sesión, una partida.
1. Hoy se convierte en "pantalla de selección de nivel": tira de semana grande con casillas cuadradas de 48 px, la de hoy parpadeando con `steps(2)` una vez al entrar y luego fija.
2. Contador de racha y semana tipo marcador de puntos en el marcador ("SEMANA 03", en pixelada de 11 px, alineado a la derecha).
3. Barra de progreso por segmentos también en Hoy: ejercicios de la sesión de hoy y sesiones de la semana.
4. Transiciones entre pantallas del wizard con barrido horizontal en 3 pasos (`steps(3)`, 180 ms).
5. Marco de recreativa en escritorio (P2.2) con un bisel interior de 1 px en `--band-muted` al 30 % (técnica de los paneles biselados de Nintendo 2001).
6. Pantalla de fin de sesión como "pantalla de récord": iniciales no, pero sí la tabla de "pesos de hoy" con cifras pixeladas de 14 px.
Riesgo: si se pasa, infantiliza. Además, la seguridad necesita una frontera muy clara con el juego.

### B. "Revista de Venice" (más editorial), **recomendada**
El gimnasio de 1989 contado como una revista de culturismo impresa, con la precisión tipográfica de 2026. El arcade se reserva para los momentos de logro.
1. **Cifra de portada en cada pantalla de la app:** un número enorme (Archivo 900 cursiva, `clamp(56px, 18cqi, 96px)`, `line-height: .9`) que cuenta el estado: "6" ejercicios en Hoy, "3" días en Plan y "+15" kg en Progreso. Es la técnica de Nike: un solo tamaño enorme y el resto callado.
2. **Reglas de imprenta en todo:** sin tarjetas rellenas, con avisos entre filetes y filas numeradas "01, 02, 03" en Archivo cursiva morada (aplicar §4 bis entero, P1.3).
3. **Marcador con dos alturas:** "portada" (Hoy, Plan y bienvenida: más alto, con la cifra y la trama más visible) y "página interior" (Ajustes y pasos del wizard: compacto, con título de una línea). Así se rompe la monotonía de 16 pantallas iguales (técnica de capítulos de PlayStation).
4. **Trama de semitono como textura de foto:** en la bienvenida y los vacíos, un degradado de puntos de tamaño variable (de 1,2 a 3 px) que simula un fotograbado de revista, en vez de la trama uniforme.
5. **Pie editorial en escritorio:** columnas de Plan con cabecera de día tipo "sección de revista" (DÍA 1 en 28 px y el foco del día como antetítulo en pixelada de 11 px).
6. **Celebraciones arcade intactas:** pop, "NIVEL ARRIBA" y fin de sesión siguen en pixelada con `steps()`. El contraste entre la revista tranquila y el estallido arcade hace que el logro se note más.

Por qué la recomiendo: es la que más se apoya en decisiones ya tomadas (§4 bis, D17 de títulos con datos, la pegatina única). Resuelve el mayor problema actual, que es la falta de protagonista en Hoy, Plan y Progreso. Y es lo que separa una app de 2026 de un tema retro: tipografía con jerarquía extrema y datos como imagen. El arcade no se pierde, se concentra.

### C. "Muscle Beach de noche" (premium deportivo, oscuro primero)
Venice al anochecer: el tema oscuro como principal, con el limón y el rosa como luz de neón contenida.
1. Tema oscuro por defecto (`#120A1C`) con el crema como opción, porque muchos gimnasios tienen luz baja.
2. Superficies en escalera de 3 tonos de morado (técnica de Raycast: `#120A1C` → `#1E1330` → `#2A1A45`) con filetes de 1 px al 18 % en vez de bordes de 2 px de tinta. Los bordes gruesos quedan solo para los controles.
3. La franja de 3 colores se convierte en un único destello diagonal en la cabecera de Hoy (como las rayas del hero de Raycast, una vez por pantalla).
4. Cifras de datos en limón sobre morado oscuro (12:1), el par de mayor contraste del sistema.
5. Sombra dura en `#FF5FA2` (en vez de morado) en el CTA del tema oscuro, para que se lea como neón.
Riesgo: pierde el "papel crema" y la calidez de revista. **CAMBIA DESIGN.md** (tema por defecto, grosor de bordes).

---

## Victorias rápidas (≤ 30 min cada una, sin cambiar decisiones)

1. `.wz-card { background: transparent; }` (prototipo, línea 295).
2. `.wz-note` entre filetes y sin caja (prototipo, línea 312).
3. Chip seleccionado con marcador propio en vez de "✓ " (prototipo, línea 345).
4. Fundido o filete superior en `.wz-foot` para que no corte el contenido seco (P1.2).
5. CTA desactivado con borde a guiones y fondo transparente (P2.1).
6. Casilla de 18 años y de consentimiento con `appearance:none`, borde de 2 px y radio de 2 px.
7. Dato de series y reps del plan en 2 líneas fijas con `nowrap` (P2.3).
8. CTA de la app en escritorio con `lg:max-w-[420px]` y filas de Ajustes y Hoy con `max-w-[640px]` hasta que lleguen las 2 columnas.
9. Marco de recreativa de la columna del wizard en escritorio: borde de 3 px, sombra dura de 8 px y margen vertical.
10. Estados `:hover` (solo `@media (hover:hover)`) y `:active` en tarjetas y chips con `steps(2)`.
11. Disclaimer a 13 px y subtítulo del marcador a 15 px.
12. Token `--tag-premium` en lugar del color fijo de `screen.tsx`.
13. Prueba de los glifos "ÍÓÁÉÚÑ" en Press Start 2P (5 min) para decidir P1.1.
14. Pestaña activa de la barra inferior con fondo limón, texto en tinta y filete superior de tinta (necesita el visto bueno de Pablo porque toca §5, pero el cambio de código es de 10 min).
