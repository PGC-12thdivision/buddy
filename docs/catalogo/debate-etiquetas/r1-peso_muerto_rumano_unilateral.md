# R1 · peso_muerto_rumano_unilateral (entrenador CSCS, bisagra y unilateral)

## 1. Etiquetas

**joints (sin cambios):** `espalda_baja, cadera, tobillo, rodilla`.
- En la versión a una pierna, la pierna de apoyo sostiene todo el peso y además tiene que equilibrarlo. La rodilla aguanta en ligera flexión y el tobillo corrige sin parar. Esa carga es real, no leve: «ante la duda, a joints».
- Efecto: no cambia nada respecto a hoy. La región `traccion_inferior` tiene alternativas de sobra para quien limitó rodilla o tobillo (rumanos bilaterales, hip thrust, puente de glúteo, hiperextensiones, patada de glúteo y abductores), así que no se quedan huecos vacíos.

**joints_light (nuevo):** `muneca, cuello_espalda_alta`.
- La muñeca sostiene la mancuerna colgando y el cuello va en la misma posición que en el rumano con mancuernas. `peso_muerto_rumano_manc` ya lleva exactamente estas dos zonas, y lo coherente es que el unilateral también las lleve.
- Efecto: no se excluye a nadie más. Solo quien limitó muñeca o cuello verá la nota.

**light_note propuesta** (unos 150 caracteres):
> «Las muñecas y la zona del cuello trabajan un poco: muñeca recta y cuello en línea con la espalda. Si notas dolor, para y márcalo como molestia.»

**Principiante absoluto (equilibrio):** el problema de este ejercicio no es una articulación sino la estabilidad. Un principiante que se tambalea pierde la espalda recta, y ese es justo el fallo que queremos evitar. No lo resolvería con etiquetas, porque las articulaciones no tienen nada que ver con el nivel. Mi propuesta:
- Hoy: mantener en `technique` la frase «Si lo necesitas, apoya la otra mano en algo fijo», que ya está. Es la progresión correcta y no alarma.
- Si el wizard recoge el nivel de experiencia (no he podido confirmar si lo hace), que una regla determinista dé prioridad a los rumanos bilaterales para principiantes. No propongo una exclusión dura. Si no hay campo de nivel, propongo dejarlo anotado en TODOS.md y no inventarlo ahora.

## 2. Experiencia de usuario

Estoy de acuerdo con Pablo en: excluir, decir el motivo y mostrar la alternativa. Un principiante que no ve nada no sabe que la app le ha cuidado. Dos matices para que siga siendo sencillo:

- **Dónde:** en la pantalla del plan (y en el aviso de «Plan actualizado» al refiltrar), no en cada sesión. Bastaría una sola línea plegable: «Hemos adaptado 2 ejercicios a las zonas que marcaste». Al abrirla: «Peso muerto rumano a una pierna → Hip thrust con mancuerna. Carga la rodilla, que marcaste en tus limitaciones.»
- **Tono:** informativo, sin diagnóstico ni promesa. Usar «carga la rodilla», nunca «no es seguro para tu rodilla» ni «para protegerte».
- **RGPD:** el texto se monta con los datos del propio usuario en su pantalla. Ni la zona ni el ejercicio excluido van a analítica, logs ni URL. Como mucho, un contador sin `user_id` ni zona.
- **joints_light:** sí señalarlos, pero solo cuando la zona leve coincide con una limitación del usuario. Si no coincide, sería ruido. En la tarjeta de la sesión iría una etiqueta discreta y neutra («La muñeca trabaja un poco») que despliega la light_note, junto al botón de molestia. En color informativo, no de alerta.

## 3. Dónde pueden discrepar

Algún experto (o el fisio) puede defender pasar `rodilla` y `tobillo` a `joints_light` en este ejercicio. Su argumento sería que la rodilla apenas se mueve (va casi isométrica) y que así se ofrece más variedad a quien limitó la rodilla. Yo no lo haría: en apoyo unipodal, la exigencia de estabilidad en rodilla y tobillo es mayor que en cualquier rumano bilateral, y la región ya tiene alternativas de sobra. Quitarlo no cuesta nada y dejarlo sí puede costar.
