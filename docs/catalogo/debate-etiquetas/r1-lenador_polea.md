# R1 · lenador_polea (Leñador en polea, giro de tronco). Experto en core y columna

## 1. Etiquetas

**Propuesta:** `joints = {espalda_baja, hombro}` (sin cambios) · `joints_light = {cadera}` (nuevo).

- **espalda_baja en joints: se queda.** Es rotación del tronco con resistencia externa. En un principiante, el giro casi siempre acaba saliendo de la zona lumbar, que es justo la parte de la columna con menos capacidad de rotar. Si alguien ha marcado la zona lumbar, el leñador no le toca. El Pallof tampoco sirve de sustituto porque lleva las mismas etiquetas. Lo que queda para esa persona es dead_bug (con la zona lumbar en light) y crunch_maquina.
- **hombro en joints: se queda.** Los brazos van estirados y sostienen el cable en diagonal por encima de la cabeza (de arriba abajo). Sí es carga de hombro.
- **cadera a joints_light, no a joints.** La cadera pivota (rota por dentro y por fuera) y la carga es baja: 5 kg de mínimo y la resistencia la frena sobre todo el tronco. Si la paso a joints, cumplo el criterio de «ante la duda, a joints», pero la duda es pequeña y el coste es real: el ejercicio se pierde para todo el que haya marcado la cadera, que es un perfil frecuente. **Efecto en el plan:** no se queda ningún hueco vacío. Con la cadera limitada siguen disponibles en core crunch_maquina, crunch_polea, pallof_polea, crunch_suelo, flexion_lateral_mancuerna, dead_bug y bird_dog (estos dos con la cadera en light). Solo desaparecen las elevaciones de rodillas o piernas, que ya tienen la cadera en joints.
- **light_note (148 caracteres):**
  «La cadera trabaja un poco: gira con el tronco, deja que el pie de atrás pivote y no fuerces el giro. Si notas dolor, para y márcalo como molestia.»

**La técnica actual es un problema.** El texto dice «girando desde la cadera. Mantén los pies firmes en el suelo». Si los pies están fijos y el giro tiene que salir de la cadera, se produce una torsión con los pies clavados en la cadera y en la rodilla de atrás. Y si la cadera no gira, el giro lo hace la zona lumbar. Propongo este texto: «De lado a la polea, con el asa en las dos manos y los brazos estirados. Lleva el asa en diagonal girando el tronco y deja que el pie de atrás pivote. Abdomen firme, sin retorcer la zona lumbar.»

## 2. Experiencia de usuario

**Apoyo la propuesta de Pablo (excluir, explicar el motivo y mostrar la alternativa), con tres condiciones:**

1. **Explicarlo una sola vez y de forma agrupada**, no ejercicio por ejercicio. En la pantalla del plan iría una tarjeta discreta, plegada por defecto: «Hemos adaptado tu plan a las zonas que marcaste · Ver cambios (2)». Al desplegarla: «Leñador en polea → Crunch en máquina. Motivo: gira el tronco con carga y trabaja la zona lumbar, que marcaste.» Nombrar la zona en la pantalla del propio usuario está permitido. En logs, analítica y URL no puede aparecer. Lo mismo al refiltrar desde Ajustes: hay que decir cuáles cambian, no solo «han cambiado N».
2. **Nada de lenguaje de protección ni de diagnóstico.** Valen «adaptado a lo que marcaste» o «motivo: carga esta zona». No valen «para proteger tu espalda» ni «seguro para ti». La seguridad se tiene que notar en que la app hace algo concreto, no en promesas.
3. **Durante la sesión no se habla de exclusiones.** El usuario solo ve los ejercicios que le tocan. Repetir lo que se ha quitado añade ruido y asusta a un principiante.

**Ejercicios con zonas en light:** solo los señalaría cuando la zona coincida con una que el usuario ha marcado. Si no ha limitado la cadera, la nota del leñador sobra y acostumbra a ignorar los avisos. Cuando sí coincide, en la sesión aparece una etiqueta neutra junto al nombre («Cadera: trabaja poco»). Al tocarla se ve la light_note, con el botón de Molestia a mano. En la ficha del ejercicio se muestran siempre, para todos, dos líneas informativas: «Carga: zona lumbar, hombro · Trabaja poco: cadera».

## 3. Dónde preveo discrepancia

El fisio (y quizá el moderador, si aplica el criterio de catálogo al pie de la letra) defenderá **cadera en joints** por «ante la duda, a joints» y porque el texto original decía literalmente «desde la cadera». Mi respuesta es que ese texto describe mal la técnica, y que la carga real en la cadera es leve y se puede regular con el pivote del pie. Si aun así gana joints, el coste es asumible, porque core tiene 7 alternativas para quien limitó la cadera. Pero exige cambiar la técnica igualmente.
