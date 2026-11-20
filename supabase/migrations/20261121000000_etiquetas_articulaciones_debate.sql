-- BUDDY: etiquetas de articulaciones de 7 ejercicios tras el debate de expertos (20/11).
-- Dictamen completo en docs/catalogo/debate-etiquetas/dictamen-final.md. Criterio del panel: si hay una
-- duda real y quitar el ejercicio cuesta poco, la zona va a joints (excluye); joints_light (aviso) solo
-- con un argumento clínico que no dependa de cuántas alternativas queden.
--   sentadilla_cajon_alto: rodilla pasa a joints; espalda_baja, codo y muneca en joints_light.
--   lenador_polea: cadera a joints; técnica nueva (gira el tronco y pivota el pie de atrás).
--   peso_muerto_rumano_unilateral: muneca y cuello_espalda_alta en joints_light.
--   remo_mancuerna: muneca a joints (mano apoyada en el banco, como en las flexiones).
--   remo_sentado_polea, remo_polea_agarre_ancho y curl_femoral_tumbado: espalda_baja en joints_light.
-- Las light_note terminan con «Si notas dolor, para y márcalo como molestia.» y no diagnostican.
-- Los planes ya guardados se refiltran desde la app (la sesión y el plan nunca muestran un ejercicio
-- que cargue una zona limitada; ver refilterForUser).

do $$
declare
  filas integer;
  esperadas constant integer := 7;
begin
  update public.exercises as e set
    joints = t.joints,
    joints_light = t.joints_light,
    technique = coalesce(t.technique, e.technique),
    light_note = t.light_note
  from (values
    ('sentadilla_cajon_alto', array['cadera','rodilla'], array['espalda_baja','codo','muneca'], null::text,
      'La zona lumbar, los codos y las muñecas trabajan un poco: espalda recta y mancuerna pegada al pecho, muñecas rectas. Si notas dolor, para y márcalo como molestia.'),
    ('lenador_polea', array['espalda_baja','hombro','cadera'], array[]::text[],
      'De lado a la polea, con el asa en las dos manos y los brazos estirados. Lleva el asa en diagonal girando el tronco y deja que el pie de atrás pivote. Abdomen firme.',
      null::text),
    ('peso_muerto_rumano_unilateral', array['espalda_baja','cadera','tobillo','rodilla'], array['muneca','cuello_espalda_alta'], null::text,
      'Las muñecas y la zona del cuello trabajan un poco: muñeca recta y cuello en línea con la espalda. Si notas dolor, para y márcalo como molestia.'),
    ('remo_mancuerna', array['hombro','codo','espalda_baja','muneca'], array[]::text[], null::text, null::text),
    ('remo_sentado_polea', array['hombro','codo'], array['espalda_baja'], null::text,
      'La zona lumbar trabaja un poco: tronco quieto y pecho alto, sin encorvarte al estirar los brazos ni echarte atrás al tirar. Si notas dolor, para y márcalo como molestia.'),
    ('remo_polea_agarre_ancho', array['hombro','codo'], array['espalda_baja'], null::text,
      'La zona lumbar trabaja un poco: tronco quieto y pecho alto, sin encorvarte al estirar los brazos ni echarte atrás al tirar. Si notas dolor, para y márcalo como molestia.'),
    ('curl_femoral_tumbado', array['rodilla'], array['espalda_baja'], null::text,
      'La zona lumbar trabaja un poco: cadera pegada al banco y sin arquear la espalda al subir los talones. Si notas dolor, para y márcalo como molestia.')
  ) as t(id, joints, joints_light, technique, light_note)
  where e.id = t.id;

  get diagnostics filas = row_count;
  if filas <> esperadas then
    raise exception 'Etiquetas: se esperaban % filas actualizadas y se han actualizado %. Revisa los IDs.', esperadas, filas;
  end if;
end $$;
