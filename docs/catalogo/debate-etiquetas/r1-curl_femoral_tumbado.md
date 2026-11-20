# R1 · curl_femoral_tumbado (médico del deporte: columna lumbar e isquiotibiales)

## 1. Etiquetas

**Propuesta:** `joints = {rodilla}` se queda igual. Añadir `joints_light = {espalda_baja}`. No pasar espalda_baja a `joints`.

**Motivo.** El curl tumbado no carga la columna en sí. La hiperextensión lumbar aparece cuando la persona compensa: despega la cadera al final del recorrido o tira con demasiado peso. Pasa a menudo en principiantes, y por eso hace falta un aviso. Pero no es carga inherente al ejercicio, que es lo que define `joints`. El curl sentado no tiene ese problema, porque la almohadilla fija los muslos y la pelvis va apoyada. Por eso el sentado sigue solo con `{rodilla}`.

**Efecto en el plan.** Quien limite rodilla: los dos curls ya están excluidos, así que no cambia nada. Quien limite espalda_baja: el tumbado sigue disponible, pero con aviso en la sesión. Nadie pierde ejercicios y no se crean huecos vacíos en traccion_inferior, una región que ya pierde rumanos y pesos muertos cuando se limita espalda_baja.

**light_note (146 caracteres):**
> «La zona lumbar trabaja un poco: cadera pegada al banco y sin arquear la espalda al subir los talones. Si notas dolor, para y márcalo como molestia.»

## 2. Experiencia de usuario

**Propuesta de Pablo (excluir + decir el motivo + alternativa): a favor, con matices de lenguaje.** Ver el cambio da más confianza que una exclusión silenciosa, y mostrarle sus propias zonas en su pantalla está permitido. Condiciones:
- El motivo se describe por **lo que hace el ejercicio** y no por la persona: «Este ejercicio carga la rodilla, que marcaste en tus limitaciones». No usar «por tu lesión» ni «por tu problema de rodilla». El usuario marcó una zona y no un diagnóstico: no sabemos si tiene una lesión.
- La alternativa se presenta como **«no carga esa zona»**. Nunca como «segura» ni «adecuada para ti».
- Nada de esto puede salir del cliente: ni analítica, ni logs, ni URL. El texto se compone en pantalla con datos que el usuario ya tiene.

**Frases que cruzan la línea → equivalentes aceptables**
| No | Sí |
|---|---|
| «Adaptado a tu lesión» | «Elegido según las zonas que marcaste» |
| «Seguro para tu espalda» | «No carga la zona lumbar» |
| «Protege tu rodilla» / «evita que empeore» | «Hemos quitado los ejercicios que cargan la rodilla» |
| «Recomendado para tu dolor lumbar» | «Alternativa sin carga en la zona lumbar» |
| «Puedes hacerlo sin riesgo» | (no hay equivalente: no se promete nada) |

En todos los casos debe seguir a mano el disclaimer y el botón de molestia.

**Ejercicios con contribución leve:** sí, pero discretos. Bastaría un indicador pequeño en la tarjeta del plan («trabaja un poco: zona lumbar») y que la light_note completa aparezca en la sesión, que es donde sirve. Lo pondría **solo cuando la zona leve coincide con una limitación del usuario**: si se muestra siempre, se convierte en ruido y la gente deja de leerlo. Un icono rojo o de alerta tampoco: transmite peligro, que es otra forma de diagnosticar.

## 3. Posible discrepancia

Algún experto podría pedir `espalda_baja` en `joints` aplicando «ante la duda, a joints», ya que el curl sentado es una alternativa limpia y sin coste. Yo no lo haría: pasar a joints algo que depende de la técnica estira el criterio y acabaría vaciando el catálogo. Como término medio aceptaría una regla determinista de **preferencia**, no de exclusión: si una zona de `joints_light` coincide con una limitación y en el mismo hueco hay otro ejercicio sin esa zona disponible con el equipo del usuario, el plan elige ese otro. Para quien limite espalda_baja daría el sentado, y el tumbado quedaría de reserva si el gimnasio no tiene máquina sentada.
