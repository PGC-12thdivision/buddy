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

### Bloqueantes legales para producción real (P2)
- **Qué:** antes de abrir BUDDY a usuarios reales: (1) licencia o sustitución del PAR-Q+ (hoy, riesgo de copyright aceptado solo para la demo, `01` §3); (2) revisión legal del disclaimer y los términos (PRD §13); (3) acuerdo de tratamiento de datos con Anthropic como encargado y verificación de su política de retención (CEO-D10, PRD §19).
- **Por qué:** no son trabajo de código y bloquean el lanzamiento; Pablo pidió dejar preparado el salto a producción (CEO-D3).
- **Pros:** el camino a producción queda escrito en un solo sitio. **Contras:** gestiones con terceros y posible coste legal.
- **Contexto:** el MVP de la demo los acepta como riesgo. Por dónde empezar: el documento oficial PAR-Q+ 2023 y sus condiciones de uso.
- **Esfuerzo:** humano M / CC S. **Depende de:** decisión de lanzar.
- **Decisión:** CEO-D17.
