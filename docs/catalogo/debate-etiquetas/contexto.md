# Debate: 6 etiquetas de articulaciones dudosas y cómo mostrar las exclusiones (BUDDY, 20/11/2026)

## Qué es BUDDY
App web (móvil) para personas que entrenan solas en el gimnasio; muchas son principiantes absolutos. Un wizard recoge foco, días, equipo del gimnasio y **limitaciones** (zonas articulares: hombro, codo, muneca, espalda_baja, cadera, rodilla, tobillo, cuello…). La app genera un plan con IA (la IA solo elige ejercicios de un catálogo cerrado) y unas reglas deterministas calculan el peso. NO es consejo médico.

## Cómo funcionan hoy las limitaciones (código real)
- Cada ejercicio tiene `joints` (zonas que carga de verdad) y `joints_light` (zonas que trabaja de forma leve).
- **joints → exclusión determinista**: si el usuario limitó una zona que está en `joints`, el ejercicio nunca entra en su plan (guardarraíl 6, no negociable). Hoy la exclusión es **silenciosa**: el plan simplemente elige otro ejercicio del mismo hueco (región: empuje inferior, tracción superior horizontal, core…). Si no hay ninguno, el hueco queda vacío con la nota "Algún hueco se ha quedado sin ejercicio. Nunca te proponemos uno que cargue una zona limitada." Al cambiar limitaciones en Ajustes, el plan se "refiltra" y se dice "Plan actualizado: han cambiado N ejercicios", sin decir cuáles ni por qué.
- **joints_light → se permite con aviso**: en la sesión aparece la `light_note` del ejercicio ("La rodilla y la zona lumbar trabajan un poco: … Si notas dolor, para y márcalo como molestia.").
- **Molestia**: botón en la sesión que para ese ejercicio hoy, sin subir carga. Si se repite, se recomienda un profesional y se ofrece añadir la zona a limitaciones.
- Criterio del catálogo: "ante la duda, a joints".

## Reglas no negociables (CLAUDE.md)
- Exclusión determinista por etiquetas; ningún plan puede incumplir una limitación.
- RGPD: las limitaciones son datos de salud. **Nunca** en logs, analítica, mensajes de error ni prompts de IA. Mostrarlas al propio usuario en su pantalla sí está permitido. Las zonas no van en URLs.
- Nada de diagnósticos ni promesas ("seguro para tu rodilla", "protege…"). No es consejo médico.
- La IA nunca toca cargas. Cambios de catálogo = migración SQL (staging → prod).
- Fuera de alcance: edición libre del plan.

## Las 6 etiquetas dudosas (datos actuales de la BBDD)
| id | nombre | región | joints | joints_light | light_note |
|---|---|---|---|---|---|
| sentadilla_cajon_alto | Sentadilla a banco alto con mancuerna | empuje_inferior | cadera | rodilla, espalda_baja | "La rodilla y la zona lumbar trabajan un poco: rodillas hacia donde apuntan los pies y espalda recta; roza el banco sin dejarte caer. Si notas dolor, para y márcalo como molestia." |
| lenador_polea | Leñador en polea (giro de tronco) | core | espalda_baja, hombro | — | null |
| peso_muerto_rumano_unilateral | Peso muerto rumano a una pierna | traccion_inferior | espalda_baja, cadera, tobillo, rodilla | — | null |
| remo_mancuerna | Remo con mancuerna | traccion_superior_horizontal | hombro, codo, espalda_baja | — | null |
| remo_sentado_polea | Remo sentado en polea | traccion_superior_horizontal | hombro, codo | — | null |
| curl_femoral_tumbado | Curl femoral tumbado | traccion_inferior | rodilla | — | null |

Observaciones del fisio en la auditoría anterior:
1. sentadilla_cajon_alto: la rodilla flexiona 70–90° → con "ante la duda, a joints" iría a joints; además le faltan codo y muñeca en joints_light (la goblet los lleva).
2. lenador_polea: "girando desde la cadera" pero cadera no está en ninguna lista → al menos joints_light.
3. peso_muerto_rumano_unilateral: falta muneca en joints_light (otros rumanos con peso libre la llevan).
4. remo_mancuerna: falta muneca. Menor.
5. remo_sentado_polea: podría llevar espalda_baja en joints_light. Menor.
6. curl_femoral_tumbado: podría llevar espalda_baja en joints_light. Menor.
Si se añade una zona a joints_light, el ejercicio necesita light_note (termina con «Si notas dolor, para y márcalo como molestia.», ≤ ~200 caracteres, sin peso ni diagnósticos).
Ojo al efecto: mover algo a joints quita ese ejercicio a TODOS los que limitaron esa zona (puede dejar huecos vacíos si la región tiene pocas alternativas; la sentadilla a banco alto es probablemente la alternativa de pierna para gente con rodilla limitada).

## La propuesta de Pablo que hay que debatir
"Un ejercicio se puede excluir e indicar que ha sido excluido por un motivo y que se presenta una alternativa." Objetivo: la experiencia más sencilla posible y, a la vez, que el usuario VEA que la app vela por su seguridad. También: ¿hay que indicar estos ejercicios "de alguna manera especial" (p. ej. los de joints_light)?
