# Evaluación del modelo del plan (U5, KTD7)

Generado por `npm run eval:plan` el 2026-11-18 con el catálogo semilla de staging. 10 perfiles fijos (src/lib/ai/plan.eval.test.ts). "Válido" = la salida pasa catálogo, región, repetidos, limitaciones (aplicadas en código) y topes.

## Resumen

| Modelo | Válido al 1.er intento | Válido final (≤3 intentos) | Tokens medios entrada / salida | Coste medio por plan ($) | Coste total ($) | Segundos por plan |
|---|---|---|---|---|---|---|
| claude-sonnet-5-5 | 10/10 | 10/10 | 3296 / 389 | 0.0105 | 0.1049 | 3.3 |
| claude-haiku-5-5 | 10/10 | 10/10 | 3296 / 1216 | 0.0009 | 0.0094 | 5.1 |

## Detalle

| Modelo | Perfil | Resultado | Intentos | Huecos | Tokens in/out | Coste ($) | Segundos |
|---|---|---|---|---|---|---|---|
| claude-sonnet-5-5 | Equilibrado 3d 60' completo | ok | ok | 0 | 3688/402 | 0.0114 | 4.0 |
| claude-sonnet-5-5 | Fuerza 4d 75' completo | ok | ok | 0 | 3631/370 | 0.0110 | 3.0 |
| claude-sonnet-5-5 | Músculo 5d 60' completo | ok | ok | 0 | 3768/461 | 0.0121 | 3.7 |
| claude-sonnet-5-5 | Grasa 3d 45' básico + correr | ok | ok | 0 | 2867/405 | 0.0098 | 3.3 |
| claude-sonnet-5-5 | Equilibrado 2d 30' básico | ok | ok | 0 | 2672/275 | 0.0081 | 2.5 |
| claude-sonnet-5-5 | Músculo 4d 60' peso libre | ok | ok | 2 | 2376/337 | 0.0081 | 2.8 |
| claude-sonnet-5-5 | Equilibrado 3d 45' completo, rodilla + pádel | ok | ok | 0 | 3691/402 | 0.0114 | 3.1 |
| claude-sonnet-5-5 | Fuerza 3d 60' básico, hombro | ok | ok | 12 | 2865/408 | 0.0098 | 3.1 |
| claude-sonnet-5-5 | Grasa 4d 45' completo, espalda baja + natación | ok | ok | 0 | 3634/373 | 0.0110 | 3.0 |
| claude-sonnet-5-5 | Músculo 5d 75' completo, muñeca | ok | ok | 0 | 3771/461 | 0.0122 | 4.5 |
| claude-haiku-5-5 | Equilibrado 3d 60' completo | ok | ok | 0 | 3688/1338 | 0.0010 | 4.9 |
| claude-haiku-5-5 | Fuerza 4d 75' completo | ok | ok | 0 | 3631/1175 | 0.0010 | 5.1 |
| claude-haiku-5-5 | Músculo 5d 60' completo | ok | ok | 0 | 3768/1123 | 0.0009 | 4.8 |
| claude-haiku-5-5 | Grasa 3d 45' básico + correr | ok | ok | 0 | 2867/1144 | 0.0009 | 5.1 |
| claude-haiku-5-5 | Equilibrado 2d 30' básico | ok | ok | 0 | 2672/1145 | 0.0008 | 4.8 |
| claude-haiku-5-5 | Músculo 4d 60' peso libre | ok | ok | 2 | 2376/1269 | 0.0009 | 5.5 |
| claude-haiku-5-5 | Equilibrado 3d 45' completo, rodilla + pádel | ok | ok | 0 | 3691/1558 | 0.0011 | 6.2 |
| claude-haiku-5-5 | Fuerza 3d 60' básico, hombro | ok | ok | 12 | 2865/1223 | 0.0009 | 5.0 |
| claude-haiku-5-5 | Grasa 4d 45' completo, espalda baja + natación | ok | ok | 0 | 3634/1061 | 0.0009 | 4.6 |
| claude-haiku-5-5 | Músculo 5d 75' completo, muñeca | ok | ok | 0 | 3771/1127 | 0.0009 | 4.6 |
