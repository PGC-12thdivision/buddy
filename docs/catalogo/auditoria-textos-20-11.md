# Auditoría de textos del catálogo (20/11): resumen

Revisaron los textos tres agentes expertos: un entrenador (técnica y seguridad), un fisioterapeuta (prudencia y notas de precaución) y un experto en lenguaje claro (comprensión). Un cuarto agente consolidó sus propuestas.

Migración: `supabase/migrations/20261120200000_textos_catalogo_auditoria.sql` (aplicada en staging y prod el 20/11).
Validador del agente consolidador (no está en el repo). Resultado: **OK, todas las reglas en verde** (55 filas, technique más larga = 200 caracteres). Una prueba con una copia rota adrede (ID mal escrito, «poco peso», coletilla rota, technique de 6 frases) detectó todos los errores.

- **55 ejercicios cambian** de los 117 del catálogo. Solo cambian name, technique y light_note. Los tipos de equipo no cambian.
- El update va **dentro** del bloque `do $$`: GET DIAGNOSTICS solo cuenta las filas de sentencias que se ejecutan dentro del propio bloque plpgsql. Si no se actualizan exactamente 55 filas, lanza una excepción.
- Origen: E = entrenador, F = fisio, L = lenguaje.

| id | qué cambia | origen |
|---|---|---|
| press_banca_barra | barras de seguridad, sacar y devolver la barra | E F |
| press_inclinado_barra | barras de seguridad, agarre, sacar la barra | E F |
| press_banca_cerrado | barras de seguridad, sacar la barra | E F |
| press_banca_multipower | topes y ganchos (soltar y enganchar) | E F |
| press_inclinado_multipower | topes y ganchos | E F |
| press_hombro_multipower | «banco con respaldo debajo» (ambigüedad), ganchos | E L |
| sentadilla_barra | altura de las barras de seguridad, salir del rack | E |
| sentadilla_multipower | topes y soltar la barra | E |
| prensa_piernas / prensa_unilateral | soltar y poner los seguros | E |
| sentadilla_hack | soltar y poner el seguro | E |
| gemelo_prensa | pie bien apoyado, seguros puestos si la máquina lo permite, sin rebotes | E F |
| peso_muerto_barra | colocación de los pies, espalda recta en todo el recorrido; nota sin «poco peso» | E F L |
| peso_muerto_rumano_barra | sacar la barra del rack, rodillas dobladas; nota sin «poco peso» | E F L |
| press_militar_barra | sacar del rack, apartar la cara | E |
| press_hombro_kettlebell | cómo llevar la pesa al hombro | E |
| pullover_mancuerna / extension_triceps_mancuerna_cabeza | agarre seguro de la mancuerna | E |
| press_frances_barra_z | bajar despacio, barra bien sujeta | E F |
| extension_cuadriceps (+ unilateral) | posición del rodillo | E |
| curl_femoral_sentado | rodillo y almohadilla | E |
| gemelo_multipower | escalón firme, no disco suelto | E |
| pajaro_contractora | asas atrás; «en cruz»; nombre «(brazos atrás)» | E L |
| pajaro_mancuernas_inclinado | «en cruz»; nombre «(brazos atrás)» | L |
| aperturas_mancuernas | «sin bajar los codos más que los hombros» | E L |
| aperturas_contractora | nombre «de pecho»; límite con los codos | L |
| press_hombro_maquina, zancada_mancuernas, peso_muerto_rumano_manc, crunch_maquina | nota sin «poco peso», con la clave concreta | E F L |
| sentadilla_goblet / sentadilla_goblet_manc | nombre «al pecho (goblet)», «baja la cadera», nota sin «poco peso» | E F L |
| sentadilla_cajon_alto | nota: rodillas hacia los pies, espalda recta | F |
| elevacion_piernas_suelo | rodillas dobladas, recorrido limitado por la zona lumbar | F |
| peso_muerto_rumano_unilateral | punto de apoyo opcional | F |
| jalon_agarre_estrecho, remo_sentado_polea, pullover_polea | «agarre» → asa, barra o cuerda (glosario) | L |
| dead_bug | piernas en el aire | L |
| patada_triceps_mancuerna, patada_gluteo_polea, aductores_maquina, abductores_maquina, extension_triceps_cabeza_polea | frases ambiguas aclaradas | L |
| curl_biceps_maquina / curl_scott | «sin dejar caer el peso al final» | L |
| remo_polea_agarre_ancho, press_suelo_mancuernas, subida_banco, hip_thrust_barra | redacción | L |
| bird_dog, elevaciones_laterales_polea, abductores_polea, hiperextensiones | nombre | L |

## Propuestas descartadas o ajustadas

- **Ganchos y topes en el resto de ejercicios de multipower** (remo, rumano, zancada, gemelo, hip thrust): no se añaden. El entrenador propone resolverlo con una ayuda fija por tipo de equipo («Cómo se usa el multipower», «Cómo se usa la prensa»). Eso es UI nueva y queda fuera de una migración de textos: lo decide Pablo.
- **Fisio «Si entrenas solo, pon las barras de seguridad»**: queda como «Pon las barras de seguridad, si las hay, justo bajo el pecho». En BUDDY todos los usuarios entrenan solos, y no todos los bancos de press tienen barras de seguridad.
- **Hack con 4 frases (E)**: se fusionan la tercera y la cuarta para cumplir el máximo de 3.
- **Entrenador «la lumbar»**: se cambia por «zona lumbar», el término que usa todo el catálogo.
- **aperturas_mancuernas**: el entrenador y el experto en lenguaje dicen lo mismo con palabras distintas. Manda la del glosario («sin bajar los codos más que los hombros»).
- **gemelo_prensa**: se añade «Deja puestos los seguros si la máquina lo permite» (punto 3 del encargo). No viene de ningún informe y depende de la máquina, de ahí el condicional. Que lo confirme el entrenador.
- **Notas «poco peso»**: en las 8, entre las versiones de E, F y L, manda la del fisio porque añade una clave concreta (por ejemplo, en crunch_maquina, «el movimiento sale del abdomen»).
- **Por el límite de 200 caracteres** se pierden matices menores: «despacio» en press_banca_cerrado, «hasta donde estés cómodo» en sentadilla_multipower y «Vuelve despacio» en el rumano a una pierna.
- **Tipos de equipo**: el glosario no pide cambios, así que no se tocan.
- **Nombres largos** («Extensión de tríceps con mancuerna sobre la cabeza», 50 caracteres): sin cambios, como propone el experto en lenguaje.
- **Dominadas y fondos difíciles para un novato** (E): no es un problema de texto, depende de qué ejercicios elige el plan.

## Etiquetas de articulaciones dudosas (no tocadas: decide Pablo)

Vienen de fisio.md. Ninguna se ha cambiado en la migración.

1. **sentadilla_cajon_alto**: `rodilla` está en joints_light, pero el ejercicio dobla la rodilla entre 70 y 90°. Con el criterio «ante la duda, a joints», iría a joints. Además le faltan `codo` y `muneca` en joints_light, que la goblet sí lleva.
2. **lenador_polea**: la técnica dice «girando desde la cadera», pero `cadera` no está en ninguna lista. Debería ir al menos a joints_light.
3. **peso_muerto_rumano_unilateral**: le falta `muneca`, que los otros rumanos con peso libre llevan en joints_light.
4. **remo_mancuerna**: le falta `muneca`. Menor.
5. **remo_sentado_polea**: podría llevar `espalda_baja` en joints_light. Menor.
6. **curl_femoral_tumbado**: podría llevar `espalda_baja` en joints_light. Menor.

Si se añade alguna en joints_light, la light_note de ese ejercicio también tiene que cambiar: hoy está a null y el fisio exige que haya nota cuando joints_light no está vacío.
