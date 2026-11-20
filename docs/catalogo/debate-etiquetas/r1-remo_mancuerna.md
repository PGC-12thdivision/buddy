# R1 · remo_mancuerna (Remo con mancuerna) · fisio de miembro superior

## 1. Etiquetas

- **joints:** `hombro, codo, espalda_baja` (sin cambios).
- **joints_light:** `muneca` (nueva).
- **light_note:** «Las muñecas trabajan un poco: mantén recta la que sujeta la mancuerna y apoya la otra mano bajo el hombro, sin cargar todo el peso en ella. Si notas dolor, para y márcalo como molestia.» (~185 caracteres)

**Por qué muñeca y por qué leve.** Las dos muñecas trabajan, y la del apoyo más que la que agarra:
- **Mano que tira:** agarre neutro con la muñeca neutra. La demanda es de agarre (flexores del antebrazo), sin extensión forzada. Es menor que en el curl, donde la muñeca va en joints.
- **Mano de apoyo:** extensión de unos 80–90° con carga en compresión, como en una flexión. La diferencia es que recibe solo una parte del peso del tronco, porque la rodilla en el banco descarga mucho. En `flexiones` la muñeca va en joints porque soporta casi todo el peso del cuerpo. Aquí la carga es claramente menor y se puede ajustar repartiendo peso hacia la rodilla.
- Coherencia con el catálogo: los ejercicios de mancuerna en los que la muñeca solo sostiene o estabiliza (zancadas, búlgara, subida al banco, rumanos con peso libre) la llevan en joints_light. `remo_barra` la lleva en joints por la pronación con barra rígida. El remo con mancuerna queda entre los dos, más cerca de los primeros.

**Efecto en el plan:** ninguno en la exclusión. Quien limitó muñeca sigue recibiendo el ejercicio, ahora con la nota. Quien limitó hombro, codo o espalda baja ya lo tenía excluido. Hay alternativas de sobra en la región: `remo_pecho_apoyado_manc` (sin apoyo de mano ni carga lumbar), `remo_maquina_unilateral`, `remo_sentado_polea` y `remo_maquina`. Mandarlo a joints no dejaría huecos, pero sería excesivo: quitaría un básico a cualquiera con una muñeca algo sensible, cuando la nota y el botón de molestia cubren el riesgo.

La nota no menciona el puño cerrado ni las paralelas como apoyo. Son opciones válidas, pero metería técnica alternativa en algo que debe leerse en 3 segundos.

## 2. Experiencia de usuario

**Propuesta de Pablo (excluir, decir el motivo y mostrar la alternativa): a favor, con matices.**
- Mostrarlo en la **pantalla del plan** y al **refiltrar**, no en mitad de la sesión. Por ejemplo, en la tarjeta del ejercicio sustituto: «En lugar de *Remo con mancuerna*, porque marcaste espalda baja.» Es una línea, sin icono de alerta. El usuario ve que la app ha tenido en cuenta su limitación y no se asusta.
- La redacción habla de la decisión del usuario y no de su cuerpo: «porque marcaste espalda baja», no «para proteger tu espalda» (eso sería una promesa) ni «tu lesión» (eso sería un diagnóstico). Es su propio dato en su pantalla, así que el RGPD lo permite. Nunca en URLs, logs ni analítica.
- Al refiltrar en Ajustes, en lugar de «han cambiado N ejercicios», mostrar la lista: «Remo con mancuerna → Remo con mancuernas en banco inclinado».
- No se puede elegir el excluido: no hay botón de «usar igualmente». Eso sería edición libre y rompería el guardarraíl.

**Ejercicios con contribución leve:** sí, que se distingan, pero de forma discreta. En la sesión, la `light_note` ya aparece donde hace falta. En el plan basta un indicador pequeño y neutro, por ejemplo «Nota técnica», que se abre con un toque. Nada de colores de peligro. En la sesión solo debe destacar el botón de molestia.

## 3. Dónde pueden discrepar

Un fisio de columna o un entrenador puede defender que la **muñeca de apoyo** vaya a **joints**, por coherencia con `flexiones` y por el criterio «ante la duda, a joints». Mi respuesta: la carga es parcial y se puede ajustar, y mandarlo a joints quitaría un básico sin necesidad. Otro desacuerdo posible es el contrario: que `espalda_baja` baje a joints_light, porque con mano y rodilla apoyadas el tronco va bastante descargado. Yo la mantendría en joints. A un principiante le cuesta mantener la columna neutra con un apoyo asimétrico, y la región tiene alternativas sin carga lumbar.
