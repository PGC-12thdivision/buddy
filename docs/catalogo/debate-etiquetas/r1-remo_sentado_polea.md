# R1 · remo_sentado_polea (diseñador UX salud/fitness + técnico deportivo)

## 1. Etiquetas
**Sí: `espalda_baja` a `joints_light`. No a `joints`.** `joints` se queda `{hombro,codo}`.

- Motivo: sentado, con pies apoyados, la zona lumbar trabaja en isométrico para mantener el tronco quieto, y en la fase de estirar los brazos el principiante tiende a encorvarse o a echarse atrás para tirar. Es carga leve y controlable, no la carga real del remo con mancuerna inclinado (que sí está en `joints`).
- Efecto: nadie pierde el ejercicio. Quien limitó `espalda_baja` ya no puede hacer `remo_mancuerna` (lo lleva en `joints`), así que el remo en polea es probablemente su **principal alternativa de tracción horizontal**: pasarlo a `joints` le dejaría un hueco vacío. Con `joints_light` lo mantiene y ve el aviso en la sesión (el código ya solo lo muestra si la zona coincide con sus limitaciones: `lightMatches` en `src/lib/domain/exclusion.ts`).
- `light_note` (≈165 caracteres):
  > «La zona lumbar trabaja un poco: tronco quieto y pecho alto, sin encorvarte al estirar los brazos ni echarte atrás al tirar. Si notas dolor, para y márcalo como molestia.»

## 2. Experiencia de usuario
Principio: **contar la decisión una vez, en el momento en que pasa, y en positivo** («hemos elegido X en lugar de Y»), sin repetirla en cada pantalla. La zona se nombra solo al propio usuario y en su pantalla.

**a) Pantalla Plan (fuente principal, calculada al vuelo).** Una nota plegable bajo el plan, tono neutro (no `warn`):
> **Adaptado a tus limitaciones.** Hemos dejado fuera 4 ejercicios que cargan zonas que has marcado. [Ver cuáles]

Desplegado, una línea por ejercicio:
> Remo con mancuerna: carga la zona lumbar. En tu plan: Remo sentado en polea.

Si un hueco quedó vacío, se mantiene el texto actual. Se calcula sin guardar nada: catálogo ∩ equipo del usuario ∩ limitaciones, agrupado por la región de cada hueco del plan. «Alternativa» = el ejercicio que ocupa ese hueco de la misma región. Solo listar excluidos de regiones que el plan usa, máximo 1 por hueco (el más común), para no abrumar con 20 nombres.

**b) Aviso tras refiltrar en Ajustes.** Hoy dice «han cambiado N ejercicios». Propuesta:
> **Guardado.** Plan actualizado por tus limitaciones:
> · Remo con mancuerna → Remo sentado en polea (carga la zona lumbar)

Esto sí es un diff real (antes/después). Se calcula en la server action del refiltrado y se devuelve en su respuesta; **no se persiste** y **nunca va en query string** (nada de `?zona=espalda_baja`). Si el usuario recarga, desaparece y queda la nota de a).

**c) Wizard/resumen.** Una sola frase, sin lista: «Tu plan evita los ejercicios que cargan las zonas que has marcado. Lo verás en la pantalla del plan.» Refuerza confianza sin retrasar el «Plan listo».

**d) Sesión (ejercicios con contribución leve).** Sin distintivo en el plan. Solo la `light_note` en la tarjeta del ejercicio, como ahora, con un icono de información (no de alerta) y el botón «Molestia» cerca. Un distintivo tipo «Precaución» en la lista del plan alarma, se repite cada día y no aporta acción; en la sesión sí la aporta (técnica + qué hacer si duele).

**Microcopy prohibido:** «seguro para tu espalda», «protege», «lesión», «riesgo». Se usa «carga» y «trabaja un poco».

**Datos:** nada nuevo en BBDD. Todo se deriva de catálogo + limitaciones + equipo + plan (ya guardados con RLS). El diff de refiltrado vive solo en la respuesta de la acción. Ningún texto con zonas en logs, analítica ni errores; el render es de servidor (RSC) para la propia sesión del usuario.

## 3. Discrepancia previsible
El fisio, con «ante la duda, a `joints`», puede pedir `espalda_baja` en `joints` para el remo en polea. Discrepo: excluiría la alternativa más estable de tracción horizontal para quien tiene la zona lumbar limitada y empujaría el plan a huecos vacíos o a opciones peores; la `light_note` + «Molestia» ya cubren el caso. También es posible que alguien pida un distintivo visible en el plan para los ejercicios con aviso; yo lo dejaría solo en la sesión.
