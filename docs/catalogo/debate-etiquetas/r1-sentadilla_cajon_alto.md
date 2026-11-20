# R1: sentadilla_cajon_alto (fisio de rodilla y readaptación)

## 1. Etiquetas

**Propuesta:** `joints = {cadera}` (sin cambios) · `joints_light = {rodilla, espalda_baja, codo, muneca}` (añado codo y muñeca).

**Motivo clínico.** En la auditoría anterior señalé que la rodilla flexiona entre 70 y 90°, y eso es verdad. Pero este ejercicio existe precisamente para eso: la sentadilla a un objetivo alto, con la cadera atrás y el recorrido limitado por el banco, es la primera sentadilla con carga que usamos en readaptación de rodilla (dolor femoropatelar, artrosis leve, vuelta tras menisco). El banco marca dónde se acaba la bajada, la mancuerna es ligera y la carga se reparte hacia la cadera. Aquí "ante la duda, a joints" no aplica, porque la duda está resuelta: es la versión de la sentadilla que menos exige a la rodilla. Codo y muñeca entran por coherencia con `sentadilla_goblet_manc`, que tiene el mismo agarre. Es un cambio menor, pero el filtro es mecánico y conviene que dos ejercicios con el mismo agarre tengan las mismas etiquetas.

**Efecto en el plan si se moviera a joints.** He revisado las migraciones: en `empuje_inferior`, sin `rodilla` en joints, solo quedan este ejercicio y los cinco de gemelo. Si se mueve, quien marque la rodilla se queda sin ningún ejercicio de cuádriceps. `volume.ts` libera ese grupo del suelo de frecuencia, así que el plan valida igualmente, pero con un hueco. Clínicamente es peor resultado: un cuádriceps sin entrenar es justo lo que empeora una rodilla que ya molesta, y un principiante sin guía acabará en la máquina que tenga más a mano. Con la propuesta, la persona con la rodilla limitada conserva este ejercicio como su alternativa de pierna, con aviso.

**light_note nueva** (unos 190 caracteres; hace falta porque una sola nota tiene que valer para las cuatro zonas):
> «La rodilla trabaja algo; la zona lumbar, los codos y las muñecas, poco. Baja despacio hasta rozar el banco, sin rebotar y con las rodillas hacia los pies. Si notas dolor, para y márcalo como molestia.»

Condición que pido: que el banco sea de verdad alto (el muslo queda por encima de la horizontal al rozarlo). Esto va en la descripción y no se toca al progresar. La progresión sube el peso, nunca la profundidad.

## 2. Experiencia de usuario

**Estoy a favor de la propuesta de Pablo para lo que está en joints:** excluir, dar el motivo y presentar la alternativa. Hoy el usuario no ve el trabajo que hace la app por su seguridad, y verlo genera confianza. Cómo lo haría:
- **Pantalla del plan:** un bloque plegable, «Ajustado a las zonas que marcaste», con una línea por cambio: «Sentadilla goblet → Sentadilla a banco alto (rodilla)». Pongo la zona y no la causa: la usó el propio usuario, así que no es un diagnóstico. Sin rojo y sin «seguro» ni «protege».
- **Refiltrado:** en vez de «han cambiado N ejercicios», la misma lista de cambios.
- **Hueco vacío:** que diga la zona («No hay ejercicio de este tipo que no cargue la rodilla con tu equipo») y recuerde que lo valore un profesional.

**Ejercicios de joints_light: sí, pero solo para quien marcó esa zona.** Para el resto la etiqueta sería ruido.
- **Plan:** una etiqueta neutra y pequeña, «Con cuidado: rodilla», con el color de texto secundario de DESIGN.md.
- **Sesión:** la light_note se ve **antes de la primera serie** (la primera vez desplegada y luego plegable), junto al botón de Molestia. Es el momento en que sirve, no después.
- **Ficha:** «Zonas que trabaja» siempre visible, para todos los usuarios.

RGPD: todo esto se calcula en el cliente o el servidor y solo se muestra al propio usuario. Nada de eventos de analítica tipo «exclusion_shown» con la zona, y la zona no va en la URL.

## 3. Posible discrepancia

Otro experto, o el moderador aplicando «ante la duda, a joints» al pie de la letra, puede defender que con 70–90° de flexión cargada la rodilla va en joints. Mi respuesta: así se cambia una molestia posible y controlada (aviso más botón de Molestia, que para el ejercicio) por una ausencia segura de trabajo de cuádriceps. Si el panel no lo acepta, la alternativa intermedia sería crear una variante a banco aún más alto, o isométrica, con la rodilla en joints_light. No debería quedar un plan sin cuádriceps.
