# R2 · médico del deporte (preguntas 1, 4 y 5)

## P1. Sentadilla a banco alto: la rodilla va a joints y acepto el hueco de la D28

No es una carga leve. Son 70–90° de flexión con peso, sin supervisión, en alguien que marcó «rodilla» sin que sepamos el motivo. El argumento del fisio («es la sentadilla de readaptación») es correcto en una consulta. En la app, en cambio, sería **prescribir un ejercicio terapéutico a una condición que no conocemos**, y eso es justo lo que el guardarraíl 1 prohíbe. A la pregunta del moderador respondo así: si este ejercicio cuenta como leve, ningún ejercicio de cuádriceps es pesado, porque todos trabajan sobre la rodilla por definición. **No propongo ninguna variante.** Una sentadilla isométrica o con el banco más alto sigue cargando la rodilla, y meterla con la etiqueta light sería la misma trampa. Acepto el hueco de la D28, con dos ajustes de texto (ver P5) y una derivación genérica: «Si quieres trabajar esta zona, coméntalo con un profesional». Esa frase deriva y no diagnostica. Mantengo mi etiqueta del curl tumbado (espalda_baja en light), que está en consenso.

## P4. Regla de preferencia: **cambio de opinión, la aplazo**

He leído el código. Los ejercicios no se eligen en un único sitio, sino en cuatro: la IA (sobre `available`), `refilterPlan`, `fillHoles` (`catalog.find`) y `repairFloor`/`fitCeiling`. Para aplicar la preferencia habría que ordenar los candidatos en todos ellos y añadir una pasada de sustitución, y además rehacer los tests de `plan-build` y `refilter`. Hoy es el día de entrega. No cabe en una tarde sin poner en riesgo el refiltrado, que ahora mismo funciona. Propongo apuntarla en TODOS.md. Tampoco hace falta para cerrar las etiquetas: la regla del moderador («si la duda es real y pasar a joints cuesta poco, va a joints») ya cubre el caso.

## P5. Nombrar la zona: es informar, siempre que la frase hable del ejercicio y no del cuerpo

- «Encaja con tu rodilla» **cruza la línea**: suena a que la app ha valorado la rodilla del usuario. Mejor: «Ningún ejercicio de pierna (empuje) de tu equipo deja sin carga la rodilla, que marcaste en tus limitaciones».
- **«No carga esa zona» puede leerse como una promesa.** El caso más claro: si el bloque del plan dice «fuera Remo con mancuerna (carga la espalda baja). En tu plan: Remo sentado en polea», el usuario entiende que el remo en polea no toca la zona lumbar, y sí la trabaja un poco. Por eso pido que, **dentro del bloque de exclusiones**, la alternativa lleve «· trabaja un poco: zona lumbar» cuando `lightMatches` no esté vacío. Es la misma línea del punto 4 del borrador, así que no añade coste. Y en las frases aceptables, «no carga esa zona» debería pasar a «no carga esa zona de forma directa».
- El resto de las frases aceptables me parecen correctas.
