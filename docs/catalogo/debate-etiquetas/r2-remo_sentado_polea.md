# R2 · remo_sentado_polea (diseñador UX)

**Corrección:** el moderador tiene razón. Mi «dejaría un hueco» era falso: quedan remo_maquina, remo_pecho_apoyado_manc y otros. Mantengo espalda_baja en joints_light por el argumento clínico (isométrico sentado, coherente con el jalón), no por las alternativas. Acepto que remo_polea_agarre_ancho lleve la misma etiqueta y la misma nota.

## P4 · Regla de preferencia: sí, y cabe en una tarde si se acota
`applyConstraints` (plan-build.ts) llama a `refilterPlan` tanto al generar como al refiltrar. Basta un único punto. En `refilterPlan`, si el ejercicio está permitido pero `lightMatches(e, limitations)` no está vacío, se busca `alternativesFor(e, ctx, used)` sin coincidencia leve y, si hay alguna, se cambia; si no, se queda. Son unas 10 líneas y 3 tests: cambia, se queda por falta de alternativa, y el volumen no varía (mismo patrón y mismo grupo principal). **No** tocaría `fillHoles`, `repairFloor` ni «Sustituir»: más superficie y más riesgo el día de la entrega. Efecto en la demo: con rodilla limitada no hay otra opción de cuádriceps, así que la sentadilla a banco alto se mantiene. Riesgo: el contador «han cambiado N» sumaría estos cambios, pero el diff de P3 los explica.

## P3 · Distintivo en el plan: cambio de opinión, sí, en texto secundario
Con la regla de preferencia, los ejercicios con coincidencia leve pasan a ser raros: solo aparecen cuando no hay alternativa limpia. El coste de ruido baja a, como mucho, una línea por plan, y solo para quien tiene esa zona marcada. Sin distintivo, el principiante se entera cuando ya tiene la máquina ajustada y no ha leído la técnica. Formato: «Trabaja un poco la zona lumbar», en gris, sin icono de alerta y sin tono `warn`, y solo si `lightMatches` no está vacío. En la sesión, la light_note en tono neutro.

## P5 · Informar sí, diagnosticar no: lo que cuenta es el sujeto de la frase
- Informar es describir el **ejercicio**: «carga la rodilla», «trabaja un poco la zona lumbar».
- Se acerca a diagnosticar o a prometer cuando se habla de la **persona** o de que algo le conviene: «encaja con tu rodilla» suena a «apto para tu rodilla». Propongo: «Ningún ejercicio de pierna (empuje) encaja con tu equipo sin cargar las zonas que marcaste.»
- Frase de la lista que se puede leer como promesa: **«no carga esa zona»**, porque afirma que lo que queda es inocuo. Hay que decir solo por qué se quitó algo, nunca que lo que queda es seguro. Quitarla de la lista de aceptables.
- Nombrar la zona en el hueco vacío es aceptable por RGPD (pantalla propia, calculado al vuelo), pero contradice el comentario de refilter.ts. Decide Pablo.
