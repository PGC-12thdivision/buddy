# 3 mejoras hechas con Claude Code

Entregable del Reto 6 (`docs/01-contexto-y-criterios.md` §2): tres mejoras, cada una con **problema, por qué, prompt y resultado**.

Las tres salen del registro de decisiones (D58, D68 y D74). Muestran tres tipos de mejora distintos: una errata de marca encontrada en una auditoría, un fallo de lógica que hacía la app inusable y un salto de calidad pedido tras probar la app.

**Sobre los prompts.** Están sacados de las transcripciones locales de Claude Code de este proyecto. Se citan literales, con las erratas de dictado o de teclado del original, salvo cuando contienen datos de salud de Pablo: entonces se parafrasean y se indica. Un "[…]" marca un recorte de partes del mensaje que tratan de otros temas.

---

## 1. Tildes rotas en la letra pixelada (D58)

**Problema.** La letra de los guiños arcade (etiquetas, celebraciones) era Press Start 2P. En mayúsculas, esa fuente dibuja Í, Ó, Á, É, Ú y Ñ a la altura de una minúscula, así que en pantalla se leía "SESIóN" o "DíAS". En una app en español, eso es una errata en la propia marca.

**Por qué.** No lo detectó ningún test, porque el texto era correcto: el fallo estaba en cómo dibuja la fuente. Salió en una auditoría de diseño con capturas reales a 360, 768 y 1280 px. Cambiar de fuente no costaba nada y se podía revertir en una línea.

**Prompt.** El encargo inicial de la auditoría no está en las transcripciones locales. Su objetivo está escrito en `docs/diseno/auditoria-2026-11-18/README.md`: "validar el diseño y la estética de la app y ver dónde mejorar sin perder el hilo «Venice 89 × arcade», elevándolo a una app de 2026". Después de la auditoría, Pablo pidió (literal):

> "retomamos buddy. necesito las maquetas vsuales de los diseños propuestros tras al auditoría para poder decidir"

Y con la comparativa de fuentes y las maquetas delante (literal):

> "acepto las recomendaciones, y eso que el muscle beach oscuro me ha gustado mucho"

**Resultado.**
- Silkscreen sustituye a Press Start 2P: mantiene el bloque arcade y dibuja bien las tildes. Pablo la eligió frente a Tiny5 y Pixelify Sans.
- Comparativa de las fuentes: `docs/diseno/auditoria-2026-11-18/fuentes-pixel.png`.
- Cambio en `src/app/layout.tsx` (import de `Silkscreen` desde `next/font/google`, con el porqué en un comentario) y en `DESIGN.md` §3.
- Commits: `8e58efa` "Auditoría de diseño: defectos y victorias rápidas" (PR #7) y `7e69281` "Decisiones de diseño tras la auditoría: dirección B y pestaña activa", que confirma D58 (PR #8).
- La misma auditoría dio lugar a las decisiones D59–D62 (dirección B "Revista de Venice", pestaña activa con contraste y Hoy en 2 columnas).

---

## 2. Ninguna sesión vacía (D68)

**Problema.** En staging, con una limitación de hombro en el perfil (el caso que reproducen los perfiles de prueba `p01-hombro-3d` y `p07-hombro-4d`), los días de torso del plan salían vacíos. La app abría una sesión "0 de 0", sin ningún ejercicio, y la primera sesión, que es la de calibración, no se podía hacer. La app no era usable para ese perfil.

**Por qué.** La exclusión por limitaciones es un guardarraíl que no se negocia: ningún ejercicio puede cargar una zona marcada. Pero con el hombro limitado, todos los ejercicios de torso del catálogo quedaban fuera, y el código rellenaba cada hueco solo con ejercicios de su misma región. La solución no podía ser saltarse la limitación: había que rehacer el día con lo que sí es posible, sin pasar los topes de volumen.

**Prompt.** Parafraseado, porque el original incluye un dato de salud de Pablo. Pablo contó que, tras generar su plan con una limitación, los días 1 y 3 salían sin ningún ejercicio y que la sesión de calibración del día 1 se abría vacía, así que no podía probar nada. Pidió que, antes de que él volviera a probar, varios agentes crearan usuarios de prueba en staging y recorrieran ciclos completos, con casos límite, y dio autonomía para arreglar lo que encontraran.

Claude Code le preguntó qué regla quería: "Con una limitación (por ejemplo, hombro), un día del plan se queda sin ejercicios posibles. ¿Qué regla quieres?". Las opciones eran rehacer el día, solo revisar el catálogo o unir días. Pablo eligió (literal): "Rehacer el día (Recomendado)".

**Resultado.**
- Regla nueva en `src/lib/domain/plan-build.ts`: si las limitaciones o el equipo dejan un día con menos de la mitad de sus huecos, el día se rehace con ejercicios posibles de cualquier región. Nunca pasa el techo de 20 series por grupo y hace sitio si hace falta. El día rehecho se llama "Cuerpo completo".
- Además, nunca se abre una sesión sin ejercicios (`src/app/actions/session.ts`, `src/components/session/start-button.tsx`).
- Tests en `src/lib/domain/plan-build.test.ts`, con una matriz de 2 a 5 días, 4 focos y 5 combinaciones de limitaciones.
- Commit `fd60d49` "Ninguna sesión vacía: los días sin ejercicios posibles se rehacen (D68)" (PR #12), y registro en `a1d89a5` (PR #14).
- El banco de pruebas de esa sesión es `scripts/e2e/ciclo.mjs` con 9 perfiles (`scripts/e2e/perfiles/`), entre ellos varios con el hombro limitado.

---

## 3. Dibujos de técnica reales (D73 → D74)

**Problema.** En la calibración, Pablo no sabía qué ejercicio tenía que hacer ni cómo hacerlo, y tampoco veía las series que llevaba. Una primera versión añadió un maniquí SVG propio con una flecha de movimiento (D73), pero los dibujos no se entendían: la prensa de piernas parecía una sentadilla.

**Por qué.** BUDDY es para gente que entrena sola. Si no entiende el ejercicio, la sugerencia de peso no le sirve y el riesgo de hacerlo mal sube. Hacía falta una ilustración de calidad, de una fuente libre y verificable, sin fotos ni recursos de terceros de origen dudoso.

**Prompt.** Primer mensaje, tras probar staging (literal, recortado):

> "He estado haciendo pruebas en staging y la verdad que cuando estaba haciendo la parte de calibración no tengo muy claro qué ejercicio tengo que hacer, cómo tengo que hacerlo, no hay explicación técnica, no hay ni siquiera un esquema gráfico o un maniquí haciendo el ejercicio, aunque sea con imágenes, indicando las flechas donde deben de ir, no tengo ningún tipo de indicación técnica de cómo hacerlo bien o correctamente, y luego tampoco tengo manera de ver las series […]"

Al ver el primer resultado, el maniquí (literal, recortado):

> "Antes de cerrar en el día de hoy he visto los dibujos. Para un niño de 5 años en un examen de dibujo técnico, muy bien. Pero para... hombre, no es esto. Deberíamos buscar imágenes, buscar referencias, crear las imágenes como se... vamos, que parezca como que es una persona que está en una máquina de prensa, de verdad. En el caso de la prensa de piernas, ¿no? Que parece que está haciendo una sentadilla. Busca referencias en internet de cómo realizar los ejercicios y adapta un poco los colores o las indicaciones. […]"

Y para cerrar (literal, recortado):

> "muy bien los dibujos, busca otra fuente para los que falten […]"

**Resultado.**
- Primera iteración (D73): técnica a la vista antes y durante el ejercicio, lista de series que se toca para corregir y calibración en dos tiempos. Commits `b5a2907`, `ff3787d` y `b025e36` (PR #21).
- Segunda iteración (D74): ilustraciones de Everkinetic con licencia CC BY-SA 4.0, adaptadas (solo el trazo, pintado con los colores del tema). Van en dos fotogramas: "1 · Empiezas" y "2 · Llegas y vuelves", con flecha morada. El crédito y la licencia aparecen bajo cada dibujo (`src/components/session/exercise-figure.tsx`).
- Generador y mapa de dibujos en `scripts/dibujos/`. Archivos en `public/ejercicios/`.
- Cobertura: 107 de 117 ejercicios con dibujo, 36 de ellos de una variante parecida y marcados como tal. Los otros 10 se quedan solo con texto, porque no había una fuente libre fiable.
- Commits `dec029c` "Sesión: dibujos de técnica reales (Everkinetic, CC BY-SA 4.0) en dos fotogramas" (PR #22) y `bcd3208` "Dibujos: face pull y elevaciones de rodillas con variante parecida de Everkinetic (107 de 117)" (PR #23).
- Aviso de licencia y créditos completos en `public/ejercicios/LEEME.md` (añadido el 20/11).
