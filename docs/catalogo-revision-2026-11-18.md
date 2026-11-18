# Revisión del catálogo de ejercicios (18/11/2026)

Propuesta para que Pablo la valide. **No es consejo médico** ni una valoración clínica: es una revisión de etiquetas de un catálogo genérico. Criterio que se sigue en todo el documento (guardarraíl 6):

- Una etiqueta de articulación se **quita** solo si esa articulación claramente no trabaja con carga de forma relevante en la versión guiada o en máquina. Ante la duda se mantiene: una exclusión de más solo quita opciones; una inclusión de más puede hacer daño.
- Una etiqueta se **añade** cuando la carga apoya directamente sobre la zona o la zona se mueve bajo carga. Las adiciones dudosas no se meten en el SQL principal; van a la sección 5 para que decida Pablo.
- Donde la biomecánica es incierta se dice "no puedo confirmar".

Fuentes leídas: `supabase/migrations/20261112131416_catalogo_semilla.sql` (32 ejercicios, 26 tipos de equipo), `src/lib/domain/types.ts`, `exclusion.ts`, `volume.ts`, `template.ts`, `refilter.ts`, `plan-build.ts` y `src/lib/wizard/answers.ts`.

## 0. Diagnóstico en una frase

El problema del hombro **no viene de etiquetas de más**: los 18 ejercicios de torso cargan el hombro de verdad (presses, remos, jalones, aperturas, pullover y elevaciones mueven la articulación glenohumeral con carga). Viene de la **composición del catálogo**: no hay ningún ejercicio de torso que deje el hombro quieto (aislamiento de brazo con apoyo). Por eso la revisión no quita etiquetas y la mejora real llega por los ejercicios nuevos (sección 2) y por la regla de código de "ninguna sesión vacía".

## 1. Ejercicios actuales: etiquetas actuales y propuestas

| id | región | articulaciones actuales | propuestas | ¿cambio? | motivo |
|---|---|---|---|---|---|
| press_pecho_maquina | empuje_superior_horizontal | hombro, codo | hombro, codo | no | Press: hombro y codo se mueven con carga. Muñeca: ver sección 5. |
| press_banca_mancuernas | empuje_superior_horizontal | hombro, codo, muneca | igual | no | Peso libre: la muñeca estabiliza la carga. |
| press_banca_barra | empuje_superior_horizontal | hombro, codo, muneca | igual | no | Ídem. |
| press_pecho_polea | empuje_superior_horizontal | hombro, codo | igual | no | Press: hombro y codo. Muñeca: ver sección 5. |
| aperturas_contractora | empuje_superior_horizontal | hombro | igual | no | Aducción horizontal del hombro con el brazo largo: mucha carga en el hombro. |
| press_hombro_maquina | empuje_superior_vertical | hombro, codo | igual | no | Press por encima de la cabeza. Cuello/espalda alta: dudoso (sección 5). |
| press_militar_mancuernas | empuje_superior_vertical | hombro, codo, muneca | igual | no | Ídem, con muñeca por peso libre. |
| press_hombro_multipower | empuje_superior_vertical | hombro, codo, muneca | igual | no | Barra guiada, la muñeca soporta la barra. |
| elevaciones_laterales_maq | empuje_superior_vertical | hombro | igual | no | Abducción de hombro: el hombro es la articulación que trabaja. |
| elevaciones_laterales_manc | empuje_superior_vertical | hombro | igual | no | Ídem. Muñeca: carga ligera con agarre neutro; no la añado. |
| remo_sentado_polea | traccion_superior_horizontal | hombro, codo | igual | no | Extensión de hombro y flexión de codo con carga. |
| remo_maquina | traccion_superior_horizontal | hombro, codo | igual | no | Ídem. |
| remo_mancuerna | traccion_superior_horizontal | hombro, codo, espalda_baja | igual | no | Dudoso, mantener: con apoyo en banco la carga lumbar baja, pero el tronco va inclinado y hay antirrotación. |
| pajaro_contractora | traccion_superior_horizontal | hombro | igual | no | Abducción horizontal del hombro. |
| jalon_pecho | traccion_superior_vertical | hombro, codo | igual | no | Aducción de hombro con el brazo por encima de la cabeza. |
| jalon_agarre_estrecho | traccion_superior_vertical | hombro, codo | igual | no | Ídem. |
| jalon_polea_doble | traccion_superior_vertical | hombro, codo | igual | no | Ídem. |
| pullover_polea | traccion_superior_vertical | hombro | igual | no | Extensión de hombro con el brazo largo: el hombro es la articulación que trabaja. |
| prensa_piernas | empuje_inferior | rodilla, cadera | igual | no | Correcto. Espalda baja: dudoso (sección 5). |
| sentadilla_hack | empuje_inferior | rodilla, cadera, espalda_baja | + cuello_espalda_alta | **sí (añadir)** | Las hombreras apoyan la carga sobre los trapecios y la espalda alta. Hombro: dudoso, no se añade (sección 5). |
| sentadilla_multipower | empuje_inferior | rodilla, cadera, espalda_baja | + hombro, + cuello_espalda_alta | **sí (añadir)** | La barra descansa sobre la espalda alta, y sujetarla obliga a mantener el hombro en abducción y rotación externa durante toda la serie. |
| sentadilla_goblet | empuje_inferior | rodilla, cadera | igual | no | Correcto. Codo, muñeca y espalda baja por sujetar la pesa delante: dudoso (sección 5). |
| extension_cuadriceps | empuje_inferior | rodilla | igual | no | Correcto. |
| zancada_mancuernas | empuje_inferior | rodilla, cadera, tobillo | igual | no | Correcto. Muñeca por llevar las mancuernas: dudoso (sección 5). |
| gemelo_maquina | empuje_inferior | tobillo | + espalda_baja, + cuello_espalda_alta | **sí (añadir)** | El equipo es genérico y en muchos gimnasios la máquina es de pie, con hombreras: la carga pasa por la columna. Si Pablo confirma que se refiere a la máquina sentada, se descarta el cambio. No puedo confirmar qué máquina tiene cada gimnasio. |
| curl_femoral_tumbado | traccion_inferior | rodilla | igual | no | Correcto. |
| curl_femoral_sentado | traccion_inferior | rodilla | igual | no | Correcto. |
| peso_muerto_rumano_manc | traccion_inferior | espalda_baja, cadera | igual | no | Correcto. Muñeca y espalda alta por agarre y retracción escapular: dudoso (sección 5). |
| peso_muerto_rumano_barra | traccion_inferior | espalda_baja, cadera | igual | no | Ídem. |
| hip_thrust_maquina | traccion_inferior | cadera | igual | no | Correcto. Espalda baja (hiperextensión al final del recorrido): dudoso (sección 5). |
| hip_thrust_barra | traccion_inferior | cadera | igual | no | Ídem. |
| abductores_maquina | traccion_inferior | cadera | igual | no | Correcto. |

**No propongo quitar ninguna etiqueta.** Las 3 propuestas son adiciones (más conservadoras). Ninguna cambia los números de hombro ni de rodilla, salvo `sentadilla_multipower`, que sale con limitación de hombro.

## 2. Ejercicios que convendría añadir (8)

Dos problemas de encaje que Pablo tiene que decidir antes de aplicar nada:

- **Región.** Los aislamientos de brazo y el core **no encajan en ninguna de las 6 regiones** (empuje/tracción × superior/inferior). Para que se puedan usar sin inventar regiones, el SQL los mete en una región **provisional forzada**: el curl en tracción superior y el tríceps en empuje superior, repartidos entre horizontal y vertical para que cada día de torso tenga alguno. Efecto secundario: la IA podría elegir un curl en un hueco de espalda de alguien **sin** limitaciones. El suelo de frecuencia de `volume.ts` solo lo detecta si "espalda" se queda por debajo de 2 sesiones. Recomendación: que el prompt o la regla de código solo ofrezca estos ejercicios cuando no quede otra opción en la región. El core no tiene ni región forzada razonable: lo dejo comentado en el SQL.
- **Grupo principal.** `types.ts` dice que el primer grupo es el principal, pero `biceps`, `triceps` y `abdominales` no están en `MAIN_MUSCLE_GROUPS`. Técnicamente funciona (`refilter.ts` compara `muscleGroups[0]` como texto y `volume.ts` ignora los grupos que no son principales), pero estos ejercicios no cuentan para el suelo ni para el techo de ningún grupo principal. Si se añadieran a la lista, el suelo de 2 veces por semana obligaría a meter brazo en todos los planes: no lo recomiendo.

| # | id | nombre | equipo | región | patrón | muscle_groups | articulaciones | carga calib. (kg) | nota |
|---|---|---|---|---|---|---|---|---|---|
| 1 | curl_biceps_maquina | Curl de bíceps en máquina | **nuevo**: `maquina_curl` (zona `brazo`, ya admitida por el `check` y con etiqueta en `zones.ts`) | no encaja; forzada: traccion_superior_horizontal | flexion_codo | {biceps} | codo, muneca | 10 | Brazo apoyado en el pupitre: el hombro queda quieto. **Dudoso** si el hombro "trabaja con carga" en sentido relevante; no puedo confirmarlo. Es la única vía de dejar opciones de torso con limitación de hombro. |
| 2 | extension_triceps_maquina | Extensión de tríceps en máquina | **nuevo**: `maquina_triceps` (zona `brazo`) | no encaja; forzada: empuje_superior_horizontal | extension_codo | {triceps} | codo, muneca | 10 | Igual que el anterior: brazo apoyado. **Dudoso** respecto al hombro. |
| 3 | curl_biceps_polea | Curl de bíceps en polea | polea_doble (existe) | no encaja; forzada: traccion_superior_vertical | flexion_codo | {biceps} | codo, muneca, hombro | 5 | Brazo sin apoyo: el hombro estabiliza. Se mantiene hombro por prudencia. Útil con limitación de rodilla, espalda baja o cadera; la polea doble ya está en el preset Básico. |
| 4 | extension_triceps_polea | Extensión de tríceps en polea | polea_doble (existe) | no encaja; forzada: empuje_superior_vertical | extension_codo | {triceps} | codo, muneca, hombro | 5 | Ídem. |
| 5 | gemelo_prensa | Gemelo en prensa | prensa_piernas (existe) | empuje_inferior | gemelo | {gemelos} | tobillo | 20 | Espalda apoyada, sin carga en los hombros. Alternativa a `gemelo_maquina` con limitación de espalda. Rodilla: se queda extendida y sin moverse; lo etiqueto igual que `gemelo_maquina` (solo tobillo). Dudoso; si Pablo duda, añadir rodilla. 20 kg es el mínimo de la prensa en el seed. |
| 6 | patada_gluteo_polea | Patada de glúteo en polea | polea_doble (existe) | traccion_inferior | extension_cadera | {gluteos,isquiotibiales} | cadera, espalda_baja | 5 | Opción de pierna sin rodilla. Espalda baja por prudencia (riesgo de hiperextensión lumbar). |
| 7 | crunch_polea | Crunch en polea | polea_doble (existe) | **no encaja en ninguna región** | flexion_tronco | {abdominales} | espalda_baja, cuello_espalda_alta | 10 | Flexión de columna con carga. No ayuda con limitación de espalda. Solo en SQL comentado. |
| 8 | pallof_polea | Press Pallof en polea | polea_doble (existe) | **no encaja en ninguna región** | antirrotacion | {abdominales} | hombro, espalda_baja | 5 | Isométrico con los brazos extendidos. Hombro y espalda baja por prudencia. Solo en SQL comentado. |

Lo que **no** tiene arreglo con el catálogo: un empuje de pierna que no cargue la rodilla. Casi todo el empuje inferior es dominante de rodilla. Con limitación de rodilla, `empuje_inferior` pasa de 1 a 2 opciones, y las dos son de gemelo. Eso lo tiene que cubrir la regla de código (por ejemplo, rellenar con tracción inferior).

Consecuencias de los dos tipos de equipo nuevos:

- Los perfiles de gimnasio ya guardados no los tienen marcados: no se ofrecerán hasta que el usuario edite su equipo.
- El preset "Completo" sí los incluirá si se lee el catálogo de la BBDD.
- El test `src/lib/wizard/answers.test.ts` lee el equipo del archivo semilla. Si los tipos nuevos van en otra migración, el test no los verá. No se rompe, pero conviene saberlo.

## 3. Ejercicios que quedan por región con una sola limitación

Calculado con un script sobre el archivo semilla. **No tiene en cuenta el equipo del usuario**: es el máximo posible con el gimnasio "Completo". La propuesta (b) incluye los cambios de etiquetas de la sección 1 y los ejercicios 1–6 de la sección 2, con sus regiones forzadas. El core (7–8) no cuenta porque no tiene región.

Columnas: ESH = empuje superior horizontal · ESV = empuje superior vertical · TSH = tracción superior horizontal · TSV = tracción superior vertical · EI = empuje inferior · TI = tracción inferior.

| limitación | (a) actual ESH / ESV / TSH / TSV / EI / TI | (b) propuesta ESH / ESV / TSH / TSV / EI / TI |
|---|---|---|
| ninguna | 5 / 5 / 4 / 4 / 7 / 7 | 6 / 6 / 5 / 5 / 8 / 8 |
| hombro | **0 / 0 / 0 / 0** / 7 / 7 | **1 / 0 / 1 / 0** / 7 / 8 |
| rodilla | 5 / 5 / 4 / 4 / **1** / 5 | 6 / 6 / 5 / 5 / **2** / 6 |
| espalda_baja | 5 / 5 / 3 / 4 / 5 / 5 | 6 / 6 / 4 / 5 / 5 / 5 |
| codo | 1 / 2 / 1 / 1 / 7 / 7 | 1 / 2 / 1 / 1 / 8 / 8 |
| muneca | 3 / 3 / 4 / 4 / 7 / 7 | 3 / 3 / 4 / 4 / 8 / 8 |

Lectura:

- **Hombro:** pasa de 0 a 2 ejercicios de torso, y solo si Pablo acepta que los aislamientos con brazo apoyado no llevan la etiqueta de hombro. Las regiones verticales siguen a 0. `sentadilla_multipower` sale de EI, pero entra `gemelo_prensa`. Un día de torso con limitación de hombro seguirá dependiendo de la regla de código.
- **Rodilla:** EI sigue siendo casi nulo (solo gemelos).
- **Espalda baja:** EI se queda en 5, porque `gemelo_maquina` sale y entra `gemelo_prensa`.
- **Codo:** no mejora. Los aislamientos de brazo cargan el codo por definición.
- **Muñeca:** sin cambios en torso, porque los aislamientos de brazo llevan muñeca.

## 4. SQL listo para convertir en migración (tras la aprobación)

No es un archivo de migración. Para aplicarlo: `npx supabase migration new catalogo_revision`, pegar el bloque y aplicar primero en staging.

```sql
-- BUDDY: revisión del catálogo (docs/catalogo-revision-2026-11-18.md). Pendiente de aprobación de Pablo.

-- 1. Etiquetas añadidas (solo adiciones; ninguna se quita).
update public.exercises set joints = '{rodilla,cadera,espalda_baja,cuello_espalda_alta}'
  where id = 'sentadilla_hack';
update public.exercises set joints = '{rodilla,cadera,espalda_baja,hombro,cuello_espalda_alta}'
  where id = 'sentadilla_multipower';
-- Solo si la máquina de gemelos es de pie con hombreras (ver sección 1):
update public.exercises set joints = '{tobillo,espalda_baja,cuello_espalda_alta}'
  where id = 'gemelo_maquina';

-- 2. Tipos de equipo nuevos (zona 'brazo', ya permitida por el check de equipment_types).
insert into public.equipment_types (id, name, zone, increment_kg, min_kg) values
  ('maquina_curl',    'Máquina de curl de bíceps',      'brazo', 5, 5),
  ('maquina_triceps', 'Máquina de extensión de tríceps','brazo', 5, 5);

-- 3. Ejercicios nuevos. Las regiones de 1–4 son PROVISIONALES (aislamiento de brazo: no encaja en ninguna).
insert into public.exercises (id, name, equipment_type_id, pattern, region, muscle_groups, joints, calibration_load_kg) values
  ('curl_biceps_maquina',       'Curl de bíceps en máquina',       'maquina_curl',    'flexion_codo',     'traccion_superior_horizontal', '{biceps}',                '{codo,muneca}',          10),
  ('extension_triceps_maquina', 'Extensión de tríceps en máquina', 'maquina_triceps', 'extension_codo',   'empuje_superior_horizontal',   '{triceps}',               '{codo,muneca}',          10),
  ('curl_biceps_polea',         'Curl de bíceps en polea',         'polea_doble',     'flexion_codo',     'traccion_superior_vertical',   '{biceps}',                '{codo,muneca,hombro}',    5),
  ('extension_triceps_polea',   'Extensión de tríceps en polea',   'polea_doble',     'extension_codo',   'empuje_superior_vertical',     '{triceps}',               '{codo,muneca,hombro}',    5),
  ('gemelo_prensa',             'Gemelo en prensa',                'prensa_piernas',  'gemelo',           'empuje_inferior',              '{gemelos}',               '{tobillo}',              20),
  ('patada_gluteo_polea',       'Patada de glúteo en polea',       'polea_doble',     'extension_cadera', 'traccion_inferior',            '{gluteos,isquiotibiales}','{cadera,espalda_baja}',   5);

-- 4. Core: SIN REGIÓN válida. No aplicar hasta que Pablo decida dónde va (o si se crea una región, que sería
--    un cambio de tipos y de plantilla, fuera de esta revisión).
-- insert into public.exercises (id, name, equipment_type_id, pattern, region, muscle_groups, joints, calibration_load_kg) values
--   ('crunch_polea', 'Crunch en polea',       'polea_doble', 'flexion_tronco', '<región por decidir>', '{abdominales}', '{espalda_baja,cuello_espalda_alta}', 10),
--   ('pallof_polea', 'Press Pallof en polea', 'polea_doble', 'antirrotacion',  '<región por decidir>', '{abdominales}', '{hombro,espalda_baja}',              5);
```

Si Pablo decide que los aislamientos con brazo apoyado (1 y 2) **sí** llevan la etiqueta de hombro, basta con añadir `hombro` a sus `joints`. Entonces, con limitación de hombro, el torso vuelve a 0 en las 4 regiones y todo queda en manos de la regla de código.

## 5. Dudas abiertas (no están en el SQL principal; no puedo confirmarlas)

1. **Muñeca en los presses de máquina y de polea** (`press_pecho_maquina`, `press_pecho_polea`, `press_hombro_maquina`). La muñeca soporta compresión al empujar las asas. Añadirla dejaría con limitación de muñeca: ESH 1 (solo aperturas) y ESV 2 (solo elevaciones).
2. **Cuello/espalda alta.** Fuera de la propuesta, ningún ejercicio la lleva, así que hoy esa limitación no excluye nada. Candidatos: presses por encima de la cabeza (trapecio superior activo) y peso muerto rumano (retracción escapular isométrica). No puedo confirmar que la carga sea relevante.
3. **Hombro en `sentadilla_hack` y en la versión de pie de `gemelo_maquina`.** Las hombreras comprimen la cintura escapular, pero el brazo no se mueve.
4. **Espalda baja** en `prensa_piernas` (flexión lumbar al bajar mucho), `sentadilla_goblet` y `zancada_mancuernas` (carga axial ligera), y en los `hip_thrust` (hiperextensión al final del recorrido). Añadirla en prensa, goblet y zancada dejaría EI con limitación de espalda baja en 2 (extensión y gemelo en prensa).
5. **Muñeca y codo por sujetar la carga** en `sentadilla_goblet`, `zancada_mancuernas` y `peso_muerto_rumano_*`.
6. **Región de los aislamientos de brazo y del core**: forzar una región (como en el SQL) o tomar otra decisión de producto. Las 6 regiones no los contemplan.
