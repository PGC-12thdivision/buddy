-- BUDDY: catálogo semilla (plan.md, U2; PRD §6; diseño D27). Tipos de equipo genéricos, no marcas.
-- Los valores siguen los tipos de src/lib/domain/types.ts: regiones, grupos principales (el primero
-- de cada ejercicio es su grupo principal) y etiquetas de articulación.
-- La carga de calibración es baja a propósito; en mancuernas, por mancuerna. Pablo revisa este catálogo en el PR.

insert into public.equipment_types (id, name, zone, increment_kg, min_kg) values
  ('prensa_piernas',          'Prensa de piernas',              'pierna',       5,   20),
  ('extension_cuadriceps',    'Extensión de cuádriceps',        'pierna',       5,    5),
  ('curl_femoral_tumbado',    'Curl femoral tumbado',           'pierna',       5,    5),
  ('curl_femoral_sentado',    'Curl femoral sentado',           'pierna',       5,    5),
  ('sentadilla_hack',         'Sentadilla hack',                'pierna',       5,   20),
  ('maquina_abductores',      'Máquina de abductores',          'pierna',       5,    5),
  ('maquina_gemelos',         'Máquina de gemelos',             'pierna',       5,   10),
  ('maquina_hip_thrust',      'Máquina de hip thrust',          'pierna',       5,   10),
  ('multipower',              'Multipower (Smith)',             'pierna',       5,   10),
  ('jalon',                   'Jalón al pecho',                 'espalda',      5,    5),
  ('remo_polea',              'Remo sentado en polea',          'espalda',      5,    5),
  ('remo_maquina',            'Remo en máquina',                'espalda',      5,    5),
  ('polea_doble',             'Polea doble',                    'espalda',    2.5,  2.5),
  ('press_pecho_maquina',     'Press de pecho en máquina',      'pecho_hombro', 5,    5),
  ('contractora',             'Contractora',                    'pecho_hombro', 5,    5),
  ('press_hombro_maquina',    'Press de hombro en máquina',     'pecho_hombro', 5,    5),
  ('elevaciones_maquina',     'Máquina de elevaciones laterales','pecho_hombro', 2.5,  2.5),
  ('mancuernas',              'Mancuernas',                     'peso_libre',   2,    2),
  ('barra',                   'Barra olímpica',                 'peso_libre',   5,   20),
  ('banco',                   'Banco',                          'peso_libre',   0,    0),
  ('rack',                    'Rack',                           'peso_libre',   0,    0),
  ('kettlebells',             'Kettlebells',                    'peso_libre',   4,    4),
  ('cinta',                   'Cinta de correr',                'cardio',       0,    0),
  ('bici_estatica',           'Bici estática',                  'cardio',       0,    0),
  ('eliptica',                'Elíptica',                       'cardio',       0,    0),
  ('remo_ergometro',          'Remo ergómetro',                 'cardio',       0,    0);

insert into public.exercises (id, name, equipment_type_id, pattern, region, muscle_groups, joints, calibration_load_kg) values
  -- Empuje superior horizontal
  ('press_pecho_maquina',       'Press de pecho en máquina',        'press_pecho_maquina', 'empuje_horizontal', 'empuje_superior_horizontal', '{pecho,triceps,hombros}', '{hombro,codo}',          20),
  ('press_banca_mancuernas',    'Press de banca con mancuernas',    'mancuernas',          'empuje_horizontal', 'empuje_superior_horizontal', '{pecho,triceps,hombros}', '{hombro,codo,muneca}',    8),
  ('press_banca_barra',         'Press de banca con barra',         'barra',               'empuje_horizontal', 'empuje_superior_horizontal', '{pecho,triceps,hombros}', '{hombro,codo,muneca}',   20),
  ('press_pecho_polea',         'Press de pecho en polea',          'polea_doble',         'empuje_horizontal', 'empuje_superior_horizontal', '{pecho,triceps}',         '{hombro,codo}',          10),
  ('aperturas_contractora',     'Aperturas en contractora',         'contractora',         'aperturas',         'empuje_superior_horizontal', '{pecho}',                 '{hombro}',               15),
  -- Empuje superior vertical
  ('press_hombro_maquina',      'Press de hombro en máquina',       'press_hombro_maquina','empuje_vertical',   'empuje_superior_vertical',   '{hombros,triceps}',       '{hombro,codo}',          15),
  ('press_militar_mancuernas',  'Press militar con mancuernas',     'mancuernas',          'empuje_vertical',   'empuje_superior_vertical',   '{hombros,triceps}',       '{hombro,codo,muneca}',    6),
  ('press_hombro_multipower',   'Press de hombro en multipower',    'multipower',          'empuje_vertical',   'empuje_superior_vertical',   '{hombros,triceps}',       '{hombro,codo,muneca}',   10),
  ('elevaciones_laterales_maq', 'Elevaciones laterales en máquina', 'elevaciones_maquina', 'elevacion_lateral', 'empuje_superior_vertical',   '{hombros}',               '{hombro}',               10),
  ('elevaciones_laterales_manc','Elevaciones laterales con mancuernas','mancuernas',       'elevacion_lateral', 'empuje_superior_vertical',   '{hombros}',               '{hombro}',                4),
  -- Tracción superior horizontal
  ('remo_sentado_polea',        'Remo sentado en polea',            'remo_polea',          'traccion_horizontal','traccion_superior_horizontal','{espalda,biceps}',      '{hombro,codo}',          25),
  ('remo_maquina',              'Remo en máquina',                  'remo_maquina',        'traccion_horizontal','traccion_superior_horizontal','{espalda,biceps}',      '{hombro,codo}',          25),
  ('remo_mancuerna',            'Remo con mancuerna',               'mancuernas',          'traccion_horizontal','traccion_superior_horizontal','{espalda,biceps}',      '{hombro,codo,espalda_baja}',10),
  ('pajaro_contractora',        'Pájaro en contractora',            'contractora',         'aperturas_inversas','traccion_superior_horizontal','{hombros,espalda}',      '{hombro}',               10),
  -- Tracción superior vertical
  ('jalon_pecho',               'Jalón al pecho',                   'jalon',               'traccion_vertical', 'traccion_superior_vertical', '{espalda,biceps}',        '{hombro,codo}',          25),
  ('jalon_agarre_estrecho',     'Jalón con agarre estrecho',        'jalon',               'traccion_vertical', 'traccion_superior_vertical', '{espalda,biceps}',        '{hombro,codo}',          25),
  ('jalon_polea_doble',         'Jalón con polea doble',            'polea_doble',         'traccion_vertical', 'traccion_superior_vertical', '{espalda,biceps}',        '{hombro,codo}',          10),
  ('pullover_polea',            'Pullover en polea',                'polea_doble',         'pullover',          'traccion_superior_vertical', '{espalda}',               '{hombro}',               10),
  -- Empuje inferior
  ('prensa_piernas',            'Prensa de piernas',                'prensa_piernas',      'sentadilla',        'empuje_inferior',            '{cuadriceps,gluteos}',    '{rodilla,cadera}',       40),
  ('sentadilla_hack',           'Sentadilla hack',                  'sentadilla_hack',     'sentadilla',        'empuje_inferior',            '{cuadriceps,gluteos}',    '{rodilla,cadera,espalda_baja}', 20),
  ('sentadilla_multipower',     'Sentadilla en multipower',         'multipower',          'sentadilla',        'empuje_inferior',            '{cuadriceps,gluteos}',    '{rodilla,cadera,espalda_baja}', 20),
  ('sentadilla_goblet',         'Sentadilla goblet',                'kettlebells',         'sentadilla',        'empuje_inferior',            '{cuadriceps,gluteos}',    '{rodilla,cadera}',        8),
  ('extension_cuadriceps',      'Extensión de cuádriceps',          'extension_cuadriceps','extension_rodilla', 'empuje_inferior',            '{cuadriceps}',            '{rodilla}',              20),
  ('zancada_mancuernas',        'Zancada con mancuernas',           'mancuernas',          'zancada',           'empuje_inferior',            '{cuadriceps,gluteos}',    '{rodilla,cadera,tobillo}', 4),
  ('gemelo_maquina',            'Gemelo en máquina',                'maquina_gemelos',     'gemelo',            'empuje_inferior',            '{gemelos}',               '{tobillo}',              20),
  -- Tracción inferior
  ('curl_femoral_tumbado',      'Curl femoral tumbado',             'curl_femoral_tumbado','flexion_rodilla',   'traccion_inferior',          '{isquiotibiales}',        '{rodilla}',              15),
  ('curl_femoral_sentado',      'Curl femoral sentado',             'curl_femoral_sentado','flexion_rodilla',   'traccion_inferior',          '{isquiotibiales}',        '{rodilla}',              20),
  ('peso_muerto_rumano_manc',   'Peso muerto rumano con mancuernas','mancuernas',          'bisagra',           'traccion_inferior',          '{isquiotibiales,gluteos}','{espalda_baja,cadera}',  10),
  ('peso_muerto_rumano_barra',  'Peso muerto rumano con barra',     'barra',               'bisagra',           'traccion_inferior',          '{isquiotibiales,gluteos}','{espalda_baja,cadera}',  30),
  ('hip_thrust_maquina',        'Hip thrust en máquina',            'maquina_hip_thrust',  'puente_cadera',     'traccion_inferior',          '{gluteos,isquiotibiales}','{cadera}',               30),
  ('hip_thrust_barra',          'Hip thrust con barra',             'barra',               'puente_cadera',     'traccion_inferior',          '{gluteos,isquiotibiales}','{cadera}',               30),
  ('abductores_maquina',        'Abductores en máquina',            'maquina_abductores',  'abduccion_cadera',  'traccion_inferior',          '{gluteos}',               '{cadera}',               20);

insert into public.activity_types (id, name) values
  ('padel',          'Pádel'),
  ('correr',         'Correr'),
  ('natacion',       'Natación'),
  ('clase_dirigida', 'Clase dirigida'),
  ('bici',           'Bici'),
  ('futbol',         'Fútbol'),
  ('otro',           'Otro');
