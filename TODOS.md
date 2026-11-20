# TODOS — BUDDY

Trabajo aplazado con su contexto, para retomarlo tras la entrega del bootcamp (camino a producción real).

## Aplazado en la revisión CEO del PRD v1 (28/10/2026)

### Foto de máquina no catalogada (PRD §6, D14) + solicitudes de máquinas en el admin (PRD §16)
- **Qué:** foto comprimida en el móvil → ruta de servidor → modelo con visión → tipo del catálogo o "no reconocida"; no reconocida → descripción en texto como solicitud para el admin. La foto nunca se persiste.
- **Por qué se aplaza:** es la integración más cara del MVP y ya era la última del orden de build. Tiene dos pendientes abiertos: la política de retención de la API de Anthropic y si es gratis o premium (con qué límite). Los presets de "Mi gimnasio" y el catálogo semilla cubren la demo.
- **Antes de retomarla:** verificar la retención de datos de la API de Anthropic, decidir gratis/premium y el límite, y aplicar el guardarraíl 9 de `CLAUDE.md` (no registrar el cuerpo de la petición).
- **Decisión:** CEO-D4 de la revisión CEO (`docs/04-revision-ceo-prd-v1.md`, fila S1-foto).

### Dominio propio para emails reales (P2, requisito de producción)
- **Qué:** verificar un dominio en Resend y usarlo también como SMTP de Supabase Auth.
- **Por qué:** sin dominio, Resend solo envía a la dirección de Pablo (D7) y el correo por defecto de Supabase solo a los miembros del equipo; nadie más puede confirmar su cuenta ni recibir emails (D34).
- **Contexto:** en la demo se acepta que Pablo es el único usuario que recibe correo. Antes de lanzar: comprar el dominio, verificarlo en Resend, configurar el SMTP propio en Supabase y probar el registro con un tercero.
- **Esfuerzo:** humano S / CC S. **Depende de:** decisión de lanzar; quita la exclusión "dominio propio" de `CLAUDE.md`.
- **Decisión:** D34 (`01`).

### Vercel Pro para cobrar de verdad (P2, requisito de producción)
- **Qué:** pasar el proyecto de Vercel de Hobby a Pro antes de aceptar pagos reales.
- **Por qué:** Vercel Hobby es solo para uso personal no comercial; la demo cobra en modo test, que no es uso comercial.
- **Contexto:** detectado al planificar el build (12/11, `plan.md`, Scope Boundaries). Revisar también la región de funciones (`fra1`) y los límites de cron de Pro.
- **Esfuerzo:** humano S / CC S. **Depende de:** decisión de lanzar.

### Bloqueantes legales para producción real (P2)
- **Qué:** antes de abrir BUDDY a usuarios reales: (1) licencia o sustitución del PAR-Q+ (hoy, riesgo de copyright aceptado solo para la demo, `01` §3); (2) revisión legal del disclaimer y los términos (PRD §13); (3) acuerdo de tratamiento de datos con Anthropic como encargado y verificación de su política de retención (CEO-D10, PRD §19).
- **Por qué:** no son trabajo de código y bloquean el lanzamiento; Pablo pidió dejar preparado el salto a producción (CEO-D3).
- **Pros:** el camino a producción queda escrito en un solo sitio. **Contras:** gestiones con terceros y posible coste legal.
- **Contexto:** el MVP de la demo los acepta como riesgo. Por dónde empezar: el documento oficial PAR-Q+ 2023 y sus condiciones de uso.
- **Esfuerzo:** humano M / CC S. **Depende de:** decisión de lanzar.
- **Decisión:** CEO-D17.

## Aplazado en la U7 (18/11/2026)

### Retirar el consentimiento debe borrar `discomfort_marks` y `health_profile` (bloqueante para producción)
- **Qué:** la acción de retirar el consentimiento (U11) tiene que borrar las marcas de Molestia y el perfil de salud. La fila neutra "detenida" de `set_logs` se queda: no es dato de salud y evita subir carga sobre un ejercicio parado (D65).
- **Por qué:** guardarraíl 8. Hoy no existe el flujo de retirar el consentimiento.

### Hoja "Editar serie" al tocar un segmento (diseño D8)
- **Qué:** en la U7 se puede deshacer una serie, pero no editarla tocando su segmento. La acción `editarSerie` ya existe; falta la hoja.
- **Por qué se aplaza:** la revisión de producto la puso la primera en la lista de recortes; Deshacer cubre la demo.

### Fin de sesión: el peso clave de la próxima sesión (diseño D7, punto 5)
- **Qué:** hoy se muestran el día y el número de ejercicios; falta "Prensa a 50 kg".

### Variedad al rellenar huecos
- **Qué:** las tres sesiones del plan de prueba empiezan por "Gemelo en máquina" (auditoría P3.6). Conviene ordenar los huecos para que un compuesto vaya antes que un aislamiento.

### Aviso de seguridad de Next.js
- **Qué:** al arrancar `npm run dev`, Next 16.4.3 avisa de una vulnerabilidad conocida y recomienda actualizar. No se ha tocado la versión: revisarlo y actualizar en una rama propia, con build y tests.

## Aplazado en el debate de etiquetas (20/11/2026)

### Regla de preferencia: elegir la alternativa sin aviso leve
- **Qué:** cuando hay que sustituir un ejercicio, preferir una alternativa que no trabaje de forma leve ninguna zona marcada (sin `lightMatches`), si existe.
- **Por qué se aplaza:** hay cuatro sitios que eligen ejercicios (`refilterPlan`, `fillHoles`, `repairFloor` y `fitCeiling`). Si solo se aplica en uno, la regla se cumpliría a veces y confundiría más de lo que ayuda. Decisión de Pablo del 20/11; dictamen en `docs/catalogo/debate-etiquetas/dictamen-final.md` §3.
- **Cómo:** un criterio de orden común (primero sin coincidencia leve, luego el orden del catálogo) usado por las cuatro funciones, con tests en cada una.

### Rellenar huecos de pierna con la rodilla marcada
- **Qué:** con la rodilla marcada no queda ningún ejercicio de cuádriceps (todos cargan la rodilla), y `fillHoles` rellena el hueco de pierna (empuje) con un gemelo. El panel lo acepta, pero el texto podría explicar que el cuádriceps queda sin trabajar a propósito.
