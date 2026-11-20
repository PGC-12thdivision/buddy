# Dictamen final · etiquetas dudosas y cómo mostrar las exclusiones (20/11)

Para Pablo. Las zonas de cada ejercicio están en dos listas. **joints** son las zonas que el ejercicio carga de verdad: si el usuario marcó una de ellas, el ejercicio sale de su plan. **joints_light** son las zonas que trabaja un poco: el ejercicio se queda, pero con un aviso.

Criterio que acordó el panel: **si hay una duda real y quitar el ejercicio cuesta poco, va a joints. Si quitarlo deja un hueco, solo se acepta joints_light con un argumento clínico que no dependa de cuántas alternativas queden.**

## 1. Etiquetas finales

| Ejercicio | joints | joints_light |
|---|---|---|
| sentadilla_cajon_alto | cadera, **rodilla** | espalda_baja, **codo, muneca** |
| lenador_polea | espalda_baja, hombro, **cadera** | — |
| peso_muerto_rumano_unilateral | espalda_baja, cadera, tobillo, rodilla | **muneca, cuello_espalda_alta** |
| remo_mancuerna | hombro, codo, espalda_baja, **muneca** | — |
| remo_sentado_polea | hombro, codo | **espalda_baja** |
| remo_polea_agarre_ancho (hermano) | hombro, codo | **espalda_baja** |
| curl_femoral_tumbado | rodilla | **espalda_baja** |

**Notas de aviso exactas (light_note):**
- sentadilla_cajon_alto: «La zona lumbar, los codos y las muñecas trabajan un poco: espalda recta y mancuerna pegada al pecho, muñecas rectas. Si notas dolor, para y márcalo como molestia.»
- peso_muerto_rumano_unilateral: «Las muñecas y la zona del cuello trabajan un poco: muñeca recta y cuello en línea con la espalda. Si notas dolor, para y márcalo como molestia.»
- remo_sentado_polea y remo_polea_agarre_ancho: «La zona lumbar trabaja un poco: tronco quieto y pecho alto, sin encorvarte al estirar los brazos ni echarte atrás al tirar. Si notas dolor, para y márcalo como molestia.»
- curl_femoral_tumbado: «La zona lumbar trabaja un poco: cadera pegada al banco y sin arquear la espalda al subir los talones. Si notas dolor, para y márcalo como molestia.»
- lenador_polea y remo_mancuerna: sin nota (`null`), porque no tienen zonas leves.

**Cambio de técnica.** Solo en el leñador: «De lado a la polea, con el asa en las dos manos y los brazos estirados. Lleva el asa en diagonal girando el tronco y deja que el pie de atrás pivote. Abdomen firme.» (El texto actual dice «girando desde la cadera con los pies firmes», que es una mala instrucción.)

**Regla de la muñeca** (la propuso el fisio de miembro superior; la adopto):
- Va a joints si la muñeca soporta peso doblada hacia atrás con la mano apoyada (suelo o banco), o si la fuerza un agarre fijo de barra recta.
- Va a joints_light si solo sostiene una mancuerna colgando.
- Aplicada al catálogo, hoy solo cambia remo_mancuerna. Los rumanos con barra se quedan en light, porque la barra cuelga y no desvía la muñeca. La regla nunca sirve para quitar una etiqueta que ya existe.

**Quién cambió de opinión:**
- **Fisio de rodilla** (rodilla a joints): la sentadilla de readaptación solo vale con el paciente valorado y un profesional delante, y BUDDY no tiene nada de eso.
- **Preparador de core** (cadera a joints): girar la cadera con carga es el propio leñador, no un fallo de técnica.
- **Fisio de miembro superior** (muñeca a joints): su argumento era de cantidad, y la postura es la misma que en las flexiones.
- **Diseñador UX:** retira que el remo en polea fuera a dejar un hueco (era falso) y acepta el distintivo en el plan.
- **Entrenador CSCS:** acepta el distintivo en el plan. Mejor que el principiante llegue avisado que enterarse con la mancuerna en la mano.
- **Médico:** retira la regla de preferencia para hoy. Hay cuatro sitios del código que eligen ejercicios.

## 2. Experiencia de usuario final

1. **Bloque plegable en Plan.** Solo aparece si el usuario marcó alguna zona. Tono neutro.
   - Título: «Ajustado a las zonas que marcaste · Ver qué hemos quitado»
   - Una línea por región del plan: «Pierna (empuje): fuera Sentadilla goblet y Prensa de piernas y 3 más (cargan la rodilla). En tu plan: Gemelo en máquina.»
   - Si la alternativa tiene una zona leve marcada, la línea añade «· trabaja un poco: zona lumbar».
   - Pie: «No es consejo médico. Si algo te molesta, para y márcalo como molestia.»
2. **Aviso tras refiltrar en Ajustes.** Primero «Guardado. Plan actualizado:», luego una línea por cambio:
   - «· Remo con mancuerna → Remo sentado en polea (carga la zona lumbar)»
   - «· Extensión de cuádriceps → sin alternativa (carga la rodilla)»
   Si el usuario recarga la página, este aviso desaparece y queda el bloque del punto 1.
3. **Hueco vacío.** «Ningún ejercicio de pierna (empuje) de tu equipo evita cargar la rodilla, que marcaste. Si quieres trabajar esta zona, coméntalo con un profesional.» Debajo sigue el enlace «Revisar Mi gimnasio».
4. **Distintivo gris de contribución leve.** Bajo el nombre del ejercicio: «Trabaja un poco: zona lumbar». Texto secundario, sin icono y sin color de alerta. Solo aparece si coincide con una zona que el usuario marcó; si no, no se ve.
5. **Nota en la sesión.** La light_note sale antes de la primera serie, como ahora, pero en tono neutro (hoy usa el color de aviso) y con el botón Molestia al lado. La sesión no habla de los ejercicios quitados.

**Frases prohibidas:** «seguro», «sin riesgo», «protege», «para proteger», «lesión», «tu problema de…», «recomendado para tu dolor», «adecuado para ti», «encaja con tu rodilla», **«no carga esa zona»**, «Con cuidado», «Precaución». Tampoco iconos ni colores de alerta en las notas leves.

**Frases aceptables:** «carga la rodilla», «trabaja un poco», «las zonas que marcaste», «que marcaste», «en tu plan», «fuera: X», «Ajustado a las zonas que marcaste» (siempre con el pie «No es consejo médico») y «Si notas dolor, para y márcalo como molestia».
Regla para redactar: la frase describe el ejercicio o lo que marcó el usuario, nunca su cuerpo ni si algo le conviene.

**Qué se calcula al vuelo, sin guardar nada.** Todo sale de datos que ya existen: catálogo, equipo, limitaciones y plan.
- Lo que hemos quitado y por qué zona.
- Las coincidencias leves (`lightMatches`).
- La zona del hueco vacío. El campo cerrado `holeReason` que ya se guarda no cambia.
- El antes y el después del refiltrado, que vive solo en la respuesta de la acción.

Las zonas solo se muestran en la pantalla del propio usuario. Nunca van en URL, analítica, logs ni mensajes de error.

## 3. Lo que decides tú

1. **Regla de preferencia** (si hay una alternativa sin zona leve marcada, elegir esa). El diseñador UX dice que cabe hoy en `refilterPlan`, en unas 10 líneas con 3 tests. El médico dice que hay que esperar, porque otras tres funciones que eligen ejercicios (`fillHoles`, `repairFloor`, `fitCeiling`) la ignorarían. **Recomiendo esperar** y apuntarla en TODOS.md: hoy es la entrega, y una regla que solo se cumple a veces confunde más de lo que ayuda.
2. **Nombrar la zona en el hueco y en el bloque.** El diseño (D28) la nombra, pero el comentario de `refilter.ts` dice «nunca la zona». **Recomiendo nombrarla.** Es el dato del propio usuario en su pantalla, se calcula al vuelo y no se guarda. Habría que actualizar ese comentario.
3. **La demo del Loom.** El guion usa la sentadilla a banco alto como ejemplo de ejercicio que «solo roza» la rodilla, y con este cambio deja de ser verdad. **Recomiendo regrabar ese fragmento** con el remo en polea y la zona lumbar marcada.

## 4. Plan de implementación (en orden)

1. **Migración de etiquetas** (unos 30 min): 7 filas de etiquetas y notas, más la técnica del leñador. Pasa primero por staging y luego por prod. **Después hay que refiltrar los planes activos**, porque un plan ya guardado puede contener ahora un ejercicio excluido (guardarraíl 6). No he comprobado si la sesión del día lo descarta por sí sola.
2. **Función pura del resumen de exclusiones**, con sus tests (unos 45 min).
3. **Bloque plegable en Plan y distintivo gris** (unos 60 min).
4. **Refiltrado con la lista de cambios** (unos 60 min): `refilterForUser` tiene que devolver los pares antes → después.
5. **Texto del hueco vacío y tono neutro de la nota en la sesión** (unos 20 min).

En total, unas 3,5–4 horas.

**Qué ve un usuario que marcó la rodilla:**
- Pierde la sentadilla a banco alto, y con ella el último ejercicio de cuádriceps.
- El hueco de pierna (empuje) normalmente se rellena con un gemelo (la función `fillHoles` busca en la misma región). Si el gemelo es el de prensa o el sentado, lleva el distintivo «Trabaja un poco: rodilla».
- El bloque del plan le dice qué ejercicios hemos quitado y que es porque cargan la rodilla.
- Si no hay gemelo posible con su equipo, ve el hueco con su texto y la recomendación de consultar a un profesional.
- Nunca ve un ejercicio que cargue la rodilla.

## 5. Decisiones de Pablo (20/11, noche) y estado

- **Regla de preferencia:** aplazada. Apuntada en `TODOS.md`.
- **Nombrar la zona:** sí, en el hueco y en el bloque. El comentario de `refilter.ts` está actualizado: el motivo que se guarda sigue siendo cerrado y la zona se calcula al vuelo en pantalla.
- **Loom:** el guion se ha actualizado y el vídeo de respaldo se ha regrabado con el bloque «Ver qué hemos quitado».

Implementado en la migración `20261121000000_etiquetas_articulaciones_debate.sql` y en `src/lib/domain/exclusion-summary.ts` (funciones puras, con tests). El plan guardado se repara solo al abrir la app (`healPlanIfNeeded`). La prueba E2E está en `scripts/e2e/exclusiones.mjs`.
