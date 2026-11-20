-- BUDDY: textos del catálogo tras la auditoría de tres expertos (20/11).
-- Revisaron los textos de 20261118171727_textos_catalogo_legibles.sql un entrenador (técnica y seguridad),
-- un fisioterapeuta (prudencia y notas de precaución) y un experto en lenguaje claro (comprensión y vocabulario).
-- Solo cambia textos: name, technique y light_note de los ejercicios que cambian (fila completa con los 3 campos).
-- No toca IDs, articulaciones (joints, joints_light), regiones, cargas ni tipos de equipo.
-- Criterio (el mismo de la migración del 18/11, más lo acordado en la auditoría):
--   castellano de España, tú, frases cortas, sin jerga sin explicar.
--   technique: 2 o 3 frases, como mucho 200 caracteres.
--   light_note: termina siempre con «Si notas dolor, para y márcalo como molestia.» No diagnostica ni promete nada.
--   Nunca se dice cuánto peso usar: la carga la calcula la app (fuera «poco peso» de las notas).
--   El equipo con mecanismo dice cómo usar su seguridad: barras de seguridad del rack, topes y ganchos
--   del multipower, seguros de la prensa y de la hack.
--   Glosario: «agarre» es la forma de coger, no una pieza (se dice asa, barra o cuerda); «hasta que queden
--   en cruz» o «sin bajar los codos más que los hombros» en lugar de «la línea de los hombros»; goblet,
--   aperturas inversas y cuadrupedia se explican en el nombre.
-- El update va dentro de un bloque do para comprobar con GET DIAGNOSTICS cuántas filas cambia:
-- si un ID está mal escrito, la migración falla en lugar de dejar el catálogo a medias.

do $$
declare
  filas integer;
  esperadas constant integer := 55;
begin
  update public.exercises as e set
    name = t.name,
    technique = t.technique,
    light_note = t.light_note
  from (values
    -- Empuje superior horizontal
    ('press_banca_barra', 'Press de banca con barra', 'Pon las barras de seguridad, si las hay, justo bajo el pecho. Agarra la barra algo más ancho que los hombros y sácala con los brazos rectos. Bájala despacio al pecho, empuja sin rebotar y devuélvela.', null),
    ('aperturas_contractora', 'Aperturas de pecho en contractora', 'Siéntate con la espalda apoyada y los codos un poco doblados. Junta las asas delante del pecho, como si abrazaras un árbol. Abre despacio, sin llevar los codos por detrás de los hombros.', null),
    ('press_inclinado_barra', 'Press inclinado con barra', 'Pon las barras de seguridad, si las hay, justo bajo el pecho. Agarra la barra algo más ancho que los hombros y sácala con los brazos estirados. Bájala despacio a la parte alta del pecho y empuja.', null),
    ('press_banca_multipower', 'Press de banca en multipower', 'Pon el banco para que la barra baje a la mitad del pecho y los topes justo por debajo. Gira la barra para soltarla de los ganchos. Baja despacio, empuja sin rebotar y gírala para engancharla.', null),
    ('press_inclinado_multipower', 'Press inclinado en multipower', 'Banco inclinado bajo la barra, que debe bajar a la parte alta del pecho, y topes justo por debajo. Gira la barra para soltarla de los ganchos. Baja despacio, empuja y gírala para engancharla.', null),
    ('aperturas_mancuernas', 'Aperturas con mancuernas', 'Túmbate en el banco con una mancuerna en cada mano y los codos un poco doblados. Abre los brazos en arco hasta notar el pecho estirado, sin bajar los codos más que los hombros. Cierra igual.', null),
    ('press_suelo_mancuernas', 'Press en el suelo con mancuernas', 'Túmbate boca arriba en el suelo, con las rodillas dobladas y una mancuerna en cada mano. Baja hasta que los codos rocen el suelo, sin dejarlos caer. Empuja hacia arriba.', null),
    -- Empuje superior vertical
    ('press_hombro_maquina', 'Press de hombro en máquina', 'Siéntate con la espalda pegada al respaldo y las asas a la altura de los hombros. Empuja hacia arriba sin llegar a estirar del todo los codos. Baja despacio.', 'Las muñecas y la zona del cuello trabajan un poco: muñecas rectas y hombros lejos de las orejas al empujar. Si notas dolor, para y márcalo como molestia.'),
    ('press_hombro_multipower', 'Press de hombro en multipower', 'Pon un banco con respaldo debajo de la barra guiada, que debe bajar justo delante de tu cara. Gírala para soltarla de los ganchos. Empuja sin arquear la espalda y baja despacio hasta la barbilla.', 'El cuello y la parte alta de la espalda trabajan un poco: no subas los hombros hacia las orejas. Si notas dolor, para y márcalo como molestia.'),
    ('press_militar_barra', 'Press militar con barra de pie', 'Saca la barra del rack y apóyala delante de los hombros. Aprieta glúteos y abdomen, aparta un poco la cara y súbela hasta encima de la cabeza. No arquees la espalda.', 'El cuello y la parte alta de la espalda trabajan un poco: no subas los hombros hacia las orejas. Si notas dolor, para y márcalo como molestia.'),
    ('elevaciones_laterales_polea', 'Elevaciones laterales en polea', 'Ponte de lado a la polea baja y agarra el asa con la mano más lejana. Sube el brazo hacia el lado hasta la altura del hombro, con el codo algo doblado. Baja despacio.', null),
    ('press_hombro_kettlebell', 'Press de hombro con kettlebell', 'Lleva la pesa al hombro ayudándote con la otra mano: descansa sobre el antebrazo, con la muñeca recta. Empújala hasta estirar el brazo. Baja despacio, sin arquear la espalda.', null),
    -- Tracción superior horizontal
    ('remo_sentado_polea', 'Remo sentado en polea', 'Siéntate con los pies en los apoyos y las rodillas algo dobladas. Tira del asa hacia el abdomen, juntando los omóplatos. Vuelve estirando los brazos sin balancear el tronco.', null),
    ('pajaro_contractora', 'Pájaros en contractora (brazos atrás)', 'Pon las asas en su posición de atrás y siéntate mirando al respaldo, con el pecho apoyado. Abre los brazos casi rectos hacia atrás hasta que queden en cruz. Vuelve despacio.', null),
    ('pajaro_mancuernas_inclinado', 'Pájaros en banco inclinado (brazos atrás)', 'Túmbate boca abajo en un banco inclinado, con una mancuerna en cada mano y los brazos casi rectos. Ábrelos hacia los lados hasta que queden en cruz. Baja despacio.', null),
    ('remo_polea_agarre_ancho', 'Remo en polea con agarre ancho', 'Siéntate en la polea de remo con una barra larga y las manos más separadas que los hombros. Tira hacia la parte baja del pecho con los codos abiertos. Vuelve sin balancear el tronco.', null),
    -- Tracción superior vertical
    ('jalon_agarre_estrecho', 'Jalón con agarre estrecho', 'Engancha el asa estrecha (en forma de V) e inclina el tronco un poco hacia atrás. Lleva el asa al pecho con los codos pegados al cuerpo. Sube despacio.', null),
    ('pullover_polea', 'Pullover en polea (brazos rectos)', 'De pie frente a la polea alta, con la barra o la cuerda y los brazos casi rectos. Bájala en arco hasta los muslos. Vuelve despacio sin pasar de la altura de la cabeza.', null),
    ('pullover_mancuerna', 'Pullover con mancuerna', 'Apoya la parte alta de la espalda en el banco y sujeta una mancuerna con las dos palmas bajo el disco de arriba. Llévala atrás con los brazos casi rectos, hasta donde estés cómodo. Vuelve.', null),
    -- Empuje inferior
    ('prensa_piernas', 'Prensa de piernas', 'Espalda apoyada y pies en el centro de la plataforma, separados como tu cadera. Suelta los seguros y baja mientras la zona lumbar siga pegada. Empuja sin estirar del todo y pon los seguros al acabar.', 'La zona lumbar (parte baja de la espalda) trabaja un poco: que no se despegue del respaldo. Si notas dolor, para y márcalo como molestia.'),
    ('sentadilla_hack', 'Sentadilla hack (máquina)', 'Espalda pegada al respaldo, hombros bajo las almohadillas y pies algo adelantados. Suelta el seguro y baja despacio. Sube con todo el pie sin estirar del todo las rodillas y pon el seguro al acabar.', 'Tus hombros solo aguantan las almohadillas de la máquina: que apoyen cómodas, sin presión. Si notas dolor, para y márcalo como molestia.'),
    ('sentadilla_multipower', 'Sentadilla en multipower', 'Pon los topes justo por debajo de lo que vas a bajar. Barra en la parte alta de la espalda, pies algo adelantados; gírala para soltarla. Baja con el pecho alto y sube sin estirar del todo.', null),
    ('sentadilla_goblet', 'Sentadilla con kettlebell al pecho (goblet)', 'Sujeta la pesa pegada al pecho, con los codos hacia abajo. Baja la cadera entre las piernas, con el pecho alto. Sube empujando con todo el pie.', 'La zona lumbar, los codos y las muñecas trabajan un poco: pesa pegada al pecho, muñecas rectas y espalda recta, sin redondearla abajo. Si notas dolor, para y márcalo como molestia.'),
    ('extension_cuadriceps', 'Extensión de cuádriceps', 'Ajusta el respaldo para que la rodilla quede a la altura del punto de giro y el rodillo sobre la parte baja de la espinilla. Estira las piernas sin dar tirones. Baja despacio.', null),
    ('zancada_mancuernas', 'Zancada con mancuernas', 'De pie, con una mancuerna en cada mano, da un paso largo hacia delante. Baja hasta que la rodilla de atrás casi toque el suelo. Vuelve empujando con el talón de delante.', 'La zona lumbar y las muñecas trabajan un poco: tronco recto, sin inclinarte hacia delante, y muñecas en línea con el antebrazo. Si notas dolor, para y márcalo como molestia.'),
    ('sentadilla_barra', 'Sentadilla con barra', 'Pon las barras de seguridad del rack justo por debajo de lo que vas a bajar. Saca la barra en la parte alta de la espalda y da dos pasos atrás. Baja con el pecho alto, rodillas hacia los pies, y sube.', null),
    ('sentadilla_goblet_manc', 'Sentadilla con mancuerna al pecho (goblet)', 'Sujeta una mancuerna en vertical, pegada al pecho. Baja la cadera entre las piernas, con el pecho alto. Sube empujando con todo el pie.', 'La zona lumbar, los codos y las muñecas trabajan un poco: mancuerna pegada al pecho, muñecas rectas y espalda recta, sin redondearla abajo. Si notas dolor, para y márcalo como molestia.'),
    ('sentadilla_cajon_alto', 'Sentadilla a banco alto con mancuerna', 'De pie delante de un banco alto, con la mancuerna pegada al pecho. Echa la cadera atrás hasta rozar el banco, sin dejarte caer. Sube empujando con todo el pie.', 'La rodilla y la zona lumbar trabajan un poco: rodillas hacia donde apuntan los pies y espalda recta; roza el banco sin dejarte caer. Si notas dolor, para y márcalo como molestia.'),
    ('subida_banco', 'Subida al banco con mancuernas', 'Con una mancuerna en cada mano, apoya un pie entero en el banco. Sube empujando con esa pierna, sin impulsarte con la de abajo. Baja despacio.', 'Las muñecas soportan algo de peso: mantenlas rectas, en línea con el antebrazo. Si notas dolor, para y márcalo como molestia.'),
    ('prensa_unilateral', 'Prensa a una pierna', 'Un solo pie en el centro de la plataforma. Suelta los seguros, baja mientras la zona lumbar siga pegada y empuja sin estirar del todo la rodilla. Pon los seguros al acabar.', 'La zona lumbar (parte baja de la espalda) trabaja un poco: que no se despegue del respaldo. Si notas dolor, para y márcalo como molestia.'),
    ('extension_cuadriceps_unilateral', 'Extensión de cuádriceps a una pierna', 'Rodilla a la altura del punto de giro y rodillo sobre la parte baja de la espinilla. Sube con una sola pierna, sin tirones, y aguanta un segundo arriba. Baja despacio.', null),
    ('gemelo_prensa', 'Gemelo en prensa', 'Deja puestos los seguros si la máquina lo permite. Apoya bien la parte delantera de los pies en el borde bajo de la plataforma, rodillas casi rectas. Empuja con las puntas y baja sin rebotar.', 'La rodilla apenas se mueve: mantenla casi recta, sin llegar a estirarla del todo. Si notas dolor, para y márcalo como molestia.'),
    ('gemelo_multipower', 'Gemelo de pie en multipower', 'Barra guiada sobre la parte alta de la espalda y la punta de los pies en un escalón firme, no en un disco suelto. Sube los talones todo lo que puedas. Baja sin rebotar.', null),
    -- Tracción inferior
    ('curl_femoral_sentado', 'Curl femoral sentado', 'Rodilla a la altura del punto de giro, almohadilla sujetando los muslos y rodillo detrás de los tobillos. Dobla las rodillas llevando el rodillo hacia abajo. Vuelve despacio.', null),
    ('peso_muerto_rumano_manc', 'Peso muerto rumano con mancuernas', 'De pie, con las rodillas un poco dobladas y una mancuerna en cada mano. Echa la cadera atrás y baja las pesas pegadas a las piernas, con la espalda recta. Sube apretando los glúteos.', 'Las muñecas y la zona del cuello trabajan un poco: muñecas rectas y cuello en línea con la espalda, mirando al suelo un poco por delante. Si notas dolor, para y márcalo como molestia.'),
    ('peso_muerto_rumano_barra', 'Peso muerto rumano con barra', 'Saca la barra del rack a la altura de los muslos, con las rodillas un poco dobladas. Echa la cadera atrás con la espalda recta y la barra pegada a las piernas. Sube apretando los glúteos.', 'Las muñecas y la zona del cuello trabajan un poco: muñecas rectas y cuello en línea con la espalda, mirando al suelo un poco por delante. Si notas dolor, para y márcalo como molestia.'),
    ('hip_thrust_barra', 'Hip thrust con barra (empuje de cadera)', 'Apoya la parte alta de la espalda en un banco y la barra, con una funda acolchada, sobre la cadera. Sube hasta que tronco y muslos queden en línea. Mete la barbilla y no arquees la espalda.', 'La zona lumbar (parte baja de la espalda) trabaja un poco: arriba, detente cuando tronco y muslos estén en línea. Si notas dolor, para y márcalo como molestia.'),
    ('abductores_maquina', 'Abductores en máquina (abrir piernas)', 'Siéntate con la espalda apoyada y las almohadillas por fuera de las rodillas. Abre las piernas sin dar tirones. Vuelve despacio, sin que las placas de peso choquen.', null),
    ('peso_muerto_barra', 'Peso muerto con barra', 'De pie, con la barra en el suelo sobre la mitad de tus pies. Agárrala con la espalda recta y el abdomen apretado, y mantenla así todo el recorrido. Sube empujando el suelo, barra pegada al cuerpo.', 'Las muñecas y la zona del cuello trabajan un poco: muñecas rectas y cuello en línea con la espalda, mirando al suelo un poco por delante. Si notas dolor, para y márcalo como molestia.'),
    ('hiperextensiones', 'Hiperextensiones en banco de lumbares', 'Coloca la almohadilla justo bajo la cadera y cruza los brazos. Baja con la espalda recta y sube hasta que el cuerpo quede en línea, sin arquearte. Empieza sin peso extra.', null),
    ('patada_gluteo_polea', 'Patada de glúteo en polea', 'Engancha la tobillera (una correa al tobillo) a la polea baja y agárrate a la máquina con las manos. Lleva la pierna hacia atrás apretando el glúteo. No arquees la zona lumbar.', null),
    ('abductores_polea', 'Abductores en polea (abrir pierna)', 'Ponte de lado a la polea baja, con la tobillera en la pierna más lejana. Separa esa pierna hacia fuera sin inclinar el tronco. Vuelve despacio.', null),
    ('aductores_maquina', 'Aductores en máquina (cerrar piernas)', 'Siéntate con las almohadillas por dentro de las rodillas. Ajusta la apertura de la máquina solo hasta notar un estiramiento cómodo. Junta las piernas sin tirones y vuelve despacio.', null),
    ('peso_muerto_rumano_unilateral', 'Peso muerto rumano a una pierna', 'De pie sobre una pierna, rodilla algo doblada y mancuerna en la mano. Si lo necesitas, apoya la otra mano en algo fijo. Inclina el tronco con la espalda recta mientras la otra pierna va atrás.', null),
    -- Brazo
    ('curl_biceps_maquina', 'Curl de bíceps en máquina', 'Apoya los brazos en la almohadilla, con los codos a la altura del punto de giro. Sube sin despegar los brazos. Baja despacio, sin dejar caer el peso al final.', 'Tu hombro participa poco aquí: mantén el brazo apoyado y muévete hasta donde estés cómodo. Si notas dolor, para y márcalo como molestia.'),
    ('curl_scott', 'Curl en banco Scott (predicador)', 'Con barra Z o una mancuerna, apoya la parte de atrás del brazo en la almohadilla inclinada. Sube sin despegar el brazo. Baja despacio, sin dejar caer el peso al final.', 'Tu hombro participa poco aquí: mantén el brazo apoyado y muévete hasta donde estés cómodo. Si notas dolor, para y márcalo como molestia.'),
    ('extension_triceps_cabeza_polea', 'Extensión de tríceps sobre la cabeza en polea', 'De espaldas a la polea, con la cuerda detrás de la cabeza y los codos junto a las orejas. Estira los brazos hacia delante y arriba. No abras los codos.', null),
    ('press_frances_barra_z', 'Press francés con barra Z (tumbado)', 'Túmbate con la barra Z sobre el pecho y los brazos estirados hacia el techo. Bájala despacio hacia la frente doblando solo los codos. Estira sin abrirlos, con la barra bien sujeta.', null),
    ('extension_triceps_mancuerna_cabeza', 'Extensión de tríceps con mancuerna sobre la cabeza', 'Siéntate con la espalda apoyada y sujeta una mancuerna con las dos palmas bajo el disco de arriba. Bájala por detrás de la cabeza doblando los codos. Estira sin abrir los codos.', null),
    ('patada_triceps_mancuerna', 'Patada de tríceps con mancuerna', 'Apoya una mano y una rodilla en el banco. Con la mancuerna en la otra mano, pega ese codo al cuerpo y estira el brazo hacia atrás. Vuelve sin mover el codo.', null),
    ('press_banca_cerrado', 'Press de banca con agarre cerrado', 'Pon las barras de seguridad, si las hay, justo bajo el pecho. Agarra la barra a la anchura de los hombros y sácala con los brazos estirados. Bájala a la parte baja del pecho, codos pegados, y empuja.', null),
    -- Abdomen y tronco
    ('crunch_maquina', 'Crunch abdominal en máquina', 'Siéntate con el pecho contra la almohadilla o las manos en las asas. Encoge el tronco llevando las costillas hacia la cadera. Vuelve despacio.', 'El cuello y los hombros trabajan un poco: no tires con los brazos ni con la cabeza; el movimiento sale del abdomen. Si notas dolor, para y márcalo como molestia.'),
    ('dead_bug', 'Bicho muerto (dead bug)', 'Boca arriba, con los brazos hacia el techo y las piernas en el aire, rodillas en ángulo recto. Estira un brazo y la pierna contraria sin despegar la zona lumbar del suelo. Cambia de lado.', 'La zona lumbar y la cadera trabajan un poco: mantén la zona lumbar pegada al suelo y muévete despacio. Si notas dolor, para y márcalo como molestia.'),
    ('bird_dog', 'A cuatro patas: brazo y pierna (bird dog)', 'A cuatro patas, con la espalda recta. Estira un brazo y la pierna contraria sin girar la cadera, y aguanta un segundo. Vuelve y cambia de lado.', 'La zona lumbar, la cadera y las rodillas trabajan un poco: muévete despacio y apoya las rodillas en la esterilla. Si notas dolor, para y márcalo como molestia.'),
    ('elevacion_piernas_suelo', 'Elevación de piernas tumbado', 'Boca arriba, con las manos bajo la cadera y las rodillas algo dobladas. Sube las piernas hacia el techo. Bájalas despacio, solo hasta donde la zona lumbar siga pegada al suelo.', null)
  ) as t(id, name, technique, light_note)
  where e.id = t.id;

  get diagnostics filas = row_count;
  if filas <> esperadas then
    raise exception 'Textos del catálogo: se esperaban % filas actualizadas y se han actualizado %. Revisa los IDs.', esperadas, filas;
  end if;
end $$;
