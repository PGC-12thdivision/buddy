# R2 · remo_mancuerna · fisio de miembro superior

## Pregunta 2: cambio de opinión. La muñeca va a joints

No tengo un argumento clínico sólido para dejarla en joints_light. Mi argumento de la ronda 1 era de cantidad («recibe solo parte del peso»), y no se sostiene:
- En `flexiones` cada muñeca soporta en torno a un tercio del peso corporal. La mano de apoyo del remo soporta una fracción parecida, y además se la carga de forma asimétrica y con el tronco rotando cuando el principiante tira.
- La posición es la misma: extensión de 80–90° en cadena cerrada. En las causas más probables de que alguien marque «muñeca» (túnel carpiano, dolor en el lado del meñique, gangliones), esa es justo la postura que provoca los síntomas. No sabemos por qué la marcó.
- Lo de «se puede ajustar repartiendo peso hacia la rodilla» depende de la técnica, y la app no puede supervisarla.

**Propuesta final:** joints `hombro, codo, espalda_baja, muneca`; joints_light vacío; light_note `null`. No cuesta nada: quedan al menos 7 remos, y `remo_pecho_apoyado_manc` hace el mismo trabajo sin la mano de apoyo.

**Regla clínica que propongo para el catálogo**, para no decidir caso a caso:
- **Muñeca en joints** si soporta peso en extensión en cadena cerrada (manos apoyadas en suelo o banco) o si la desvía un agarre fijo (barra recta).
- **Muñeca en joints_light** si solo sostiene una mancuerna o kettlebell colgando, en agarre neutro (zancadas, búlgara, rumanos).

La regla deja bien `flexiones`, `remo_barra` y las zancadas. Es la que debería haber aplicado en la ronda 1.

## Pregunta 5: ¿nombrar la zona es informar o diagnosticar?

Es informar, siempre que la frase atribuya la zona **a lo que marcó el usuario** y no a su cuerpo ni a nuestra valoración.
- «encaja con tu rodilla»: **evitar**. Suena a que hemos evaluado su rodilla y a que lo que queda le «encaja», lo que se lee como promesa de idoneidad. Mejor: «Ningún ejercicio de pierna (empuje) con tu equipo deja fuera la rodilla, que marcaste.» O, más corta: «…sin cargar la rodilla, que marcaste».
- «no carga esa zona» (de la lista de aceptables) **es la más arriesgada**: es una afirmación absoluta que un usuario puede leer como «es seguro». Propongo «no está entre los que cargan esa zona» o, mejor aún, no decirlo: basta con «fuera: X (carga la espalda baja)».
- «carga la rodilla», «trabaja un poco» y «las zonas que marcaste» describen el ejercicio o recuerdan una decisión del usuario. Son aceptables.
- «en tu plan» es aceptable.
