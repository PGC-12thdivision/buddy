# Moderador · borrador tras la ronda 1

**Lectura crítica.** Los seis expertos dejan los `joints` tal como estaban y solo añaden zonas a `joints_light`. Nadie aplica «ante la duda, a joints». Lo he comprobado contra las migraciones:
- **Argumentos que se sostienen:** curl tumbado (la carga lumbar viene de compensar, no del ejercicio), remo en polea (isométrico sentado; el jalón ni siquiera lleva espalda_baja) y rumano unilateral (sin cambios en joints).
- **Argumentos con datos erróneos:**
  - Remo en polea: «Pasarlo a joints dejaría un hueco» es falso. Con espalda_baja limitada siguen disponibles remo_maquina, remo_maquina_unilateral, remo_pecho_apoyado_manc, remo_polea_agarre_ancho, face_pull y dos pájaros.
  - Leñador: «Con la lumbar limitada queda crunch_maquina» es falso, porque crunch_maquina lleva espalda_baja en joints. Solo quedan dead_bug y bird_dog.
- **Dato que se confirma:** con la rodilla limitada, empuje_inferior solo conserva sentadilla_cajon_alto y 5 gemelos. Es el único ejercicio de cuádriceps que queda.
- **Sesgo a declarar:** `docs/entrega/guion-loom-4min.md` usa la sentadilla a banco alto como ejemplo de ejercicio que «solo roza» la rodilla. Que la demo dependa de esa etiqueta **no** es un argumento clínico.

Regla que propongo para todo el catálogo: **si la duda es real y pasar a joints cuesta poco (quedan alternativas), va a joints. Si cuesta un hueco, solo se acepta joints_light con un argumento clínico que no dependa de cuántas alternativas queden.**

## 1. Etiquetas

| Ejercicio | joints | joints_light | Estado |
|---|---|---|---|
| sentadilla_cajon_alto | cadera, **rodilla** | espalda_baja, codo, muneca | EN DISPUTA |
| lenador_polea | espalda_baja, hombro, **cadera** | — | EN DISPUTA |
| peso_muerto_rumano_unilateral | espalda_baja, cadera, tobillo, rodilla | muneca, cuello_espalda_alta | CONSENSO |
| remo_mancuerna | hombro, codo, espalda_baja, **muneca** | — | EN DISPUTA |
| remo_sentado_polea | hombro, codo | espalda_baja | CONSENSO (+ coherencia) |
| curl_femoral_tumbado | rodilla | espalda_baja | CONSENSO |

- **sentadilla_cajon_alto.** En un ejercicio de cuádriceps, la rodilla es la articulación que hace el trabajo. Que sea «la sentadilla que menos exige» la compara con otras sentadillas, pero eso no la convierte en carga leve. Además, el usuario no tiene supervisión y no sabemos qué significa «rodilla» para él. El diseño ya previó este hueco: el ejemplo de la D28 (§11.27) es «Ningún ejercicio de cuádriceps encaja con tu rodilla y tu equipo». El argumento de que «un cuádriceps sin entrenar empeora la rodilla» es consejo clínico, y la app no puede darlo. Codo y muñeca se añaden por coherencia con sentadilla_goblet_manc.
  - light_note (162): «La zona lumbar, los codos y las muñecas trabajan un poco: espalda recta y mancuerna pegada al pecho, muñecas rectas. Si notas dolor, para y márcalo como molestia.»
  - Si gana la postura del fisio (rodilla en light), su nota (200): «La rodilla trabaja algo; la zona lumbar, los codos y las muñecas, poco. Baja despacio hasta rozar el banco, sin rebotar y con las rodillas hacia los pies. Si notas dolor, para y márcalo como molestia.» La descripción tendría que decir además que el muslo queda por encima de la horizontal.
- **lenador_polea.** El propio experto reconoce que quedan 7 alternativas de core para quien limita la cadera, así que pasarla a joints no cuesta nada. Si la cadera va a joints, el ejercicio no necesita light_note. La técnica cambia en cualquier caso: «De lado a la polea, con el asa en las dos manos y los brazos estirados. Lleva el asa en diagonal girando el tronco y deja que el pie de atrás pivote. Abdomen firme.» Si gana joints_light, la nota sería (146): «La cadera trabaja un poco: gira con el tronco, deja que el pie de atrás pivote y no fuerces el giro. Si notas dolor, para y márcalo como molestia.»
- **peso_muerto_rumano_unilateral** (143): «Las muñecas y la zona del cuello trabajan un poco: muñeca recta y cuello en línea con la espalda. Si notas dolor, para y márcalo como molestia.»
- **remo_mancuerna.** La mano de apoyo trabaja en extensión de 80–90° y en cadena cerrada, igual que en `flexiones`, que lleva la muñeca en joints. Quien limita la muñeca tiene al menos 7 remos alternativos, así que joints no cuesta nada. Si gana joints_light, la nota sería (159): «La muñeca de apoyo trabaja un poco: mano bajo el hombro y parte del peso en la rodilla del banco; la otra, recta. Si notas dolor, para y márcalo como molestia.»
- **remo_sentado_polea** (169): «La zona lumbar trabaja un poco: tronco quieto y pecho alto, sin encorvarte al estirar los brazos ni echarte atrás al tirar. Si notas dolor, para y márcalo como molestia.» Por coherencia, **remo_polea_agarre_ancho** debe recibir la misma etiqueta y la misma nota, porque es el mismo aparato y la misma postura.
- **curl_femoral_tumbado** (147): «La zona lumbar trabaja un poco: cadera pegada al banco y sin arquear la espalda al subir los talones. Si notas dolor, para y márcalo como molestia.»

## 2. Experiencia de usuario (una tarde, sin datos nuevos)

**Principio:** se excluye, se dice el motivo y se muestra la alternativa, una sola vez y donde ocurre. No hay botón de «usar igualmente», porque sería edición libre.

1. **Plan**: un bloque plegable (`<details>`) en tono neutro, solo si hay alguna limitación.
   - Resumen: «Ajustado a las zonas que marcaste · Ver qué hemos quitado».
   - Una línea por cada región del plan: «Espalda (remo): fuera Remo con mancuerna y Remo con barra, porque cargan la espalda baja. En tu plan: Remo sentado en polea.» Se muestran 2 nombres como máximo, más «y N más».
   - Pie: «No es consejo médico. Si algo te molesta, para y márcalo como molestia.»
   - Se calcula al vuelo en el servidor (RSC) con la lista de ejercicios del catálogo, el equipo del usuario y sus limitaciones (`isExcludedByLimitations`), agrupado por las regiones del plan. Para la creación es honesto: la IA nunca vio esos ejercicios, así que nada se ha «sustituido».
2. **Hueco vacío**: se alinea con la D28 nombrando la zona, calculada al vuelo y sin guardarla en `holeReason`: «Ningún ejercicio de pierna (empuje) encaja con tu rodilla y tu equipo.» El comentario de `refilter.ts` dice «nunca la zona», lo que contradice el ejemplo de §11.27. **Pablo tiene que confirmarlo.**
3. **Refiltrado en Ajustes**: la server action compara el plan anterior con el nuevo y devuelve la diferencia en su respuesta, sin guardarla. Ejemplos de líneas: «Guardado. Plan actualizado: · Remo con mancuerna → Remo sentado en polea (carga la espalda baja)» y «· Extensión de cuádriceps → sin alternativa (carga la rodilla)». Si el usuario recarga la página, la diferencia se pierde y queda el bloque del punto 1.
4. **joints_light**: en el plan, bajo el nombre del ejercicio, una línea en texto secundario, «Trabaja un poco: zona lumbar». Solo aparece si `lightMatches` no está vacío. En la sesión, la light_note sale antes de la primera serie, como ahora, pero en tono neutro en lugar de `warn`, con el botón Molestia al lado. (EN DISPUTA)
5. **Wizard y sesión**: sin cambios. Durante la sesión no se habla de exclusiones.
6. **RGPD**: las zonas solo se renderizan para el propio usuario. No van en URL, query, analítica, logs ni errores. No se guarda nada nuevo.

**Frases prohibidas:** seguro / sin riesgo, protege / para proteger, lesión / tu problema de, recomendado para tu dolor, adecuado para ti, «Con cuidado», «Precaución», iconos o colores de alerta en las notas leves.
**Frases aceptables:** «carga la rodilla», «trabaja un poco», «las zonas que marcaste», «no carga esa zona», «en tu plan», «si notas dolor, para y márcalo como molestia».

## 3. Preguntas de debate

1. **Fisio de rodilla y médico del deporte.** Sin mencionar cuántas alternativas quedan, ¿es leve la carga de la rodilla en una sentadilla a banco alto con mancuerna, hecha sin supervisión por alguien que marcó «rodilla» sin decir por qué? Si es leve, ¿qué ejercicio de cuádriceps no lo sería? Y, médico, ¿aceptas el hueco que ya prevé la D28 o propones una variante concreta?
2. **Preparador de core y fisio de miembro superior.** En el leñador (cadera) y en el remo con mancuerna (muñeca de apoyo), pasar a joints no cuesta ningún ejercicio útil. ¿Qué argumento clínico, y no de variedad, justifica dejarlos en joints_light frente al criterio del catálogo y frente a `flexiones`, que lleva la muñeca en joints?
3. **Diseñador UX, entrenador CSCS y fisio de rodilla.** ¿Distintivo en el plan («Trabaja un poco: zona lumbar») o solo aviso en la sesión? Pido el coste concreto de cada opción: ruido para quien ve el plan a diario frente a un principiante que no sabe que el ejercicio toca su zona hasta que lo está haciendo.
4. **Médico del deporte y diseñador UX.** ¿Vale la regla de preferencia del médico (si hay una alternativa sin coincidencia leve, se elige esa) como término medio que evita discutir cada etiqueta? ¿Cabe en una tarde, o es un cambio de `plan-build` que debe esperar?
5. **Todos.** ¿Nombrar la zona en el hueco vacío y en el plan («encaja con tu rodilla») es informar o es diagnosticar? ¿Hay alguna frase de la lista de aceptables que un usuario pudiera leer como una promesa?
