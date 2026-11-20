# Envío de la entrega a No Code Hackers

Qué hay que mandar, dónde está cada cosa y el correo listo para enviar.

## Qué piden

| Fuente | Qué piden | Dónde está |
|---|---|---|
| Correo de Alex (09/06/2026) | App desplegada | https://buddy-xi-eight.vercel.app |
| | Backend real | Supabase (Postgres con RLS y 12 migraciones), Server Actions y rutas de la API. Ver `docs/entrega/entrega.md` §5 |
| | Al menos una integración de punta a punta | Tres, comprobadas en prod el 20/11: Anthropic (plan con IA), Stripe (pago → premium) y Resend (correos). `entrega.md` §2 |
| | PRD con GStack | `docs/02-prd-v1.md` y `docs/04-revision-ceo-prd-v1.md` |
| | Plan de construcción con Compound Engineering | `plan.md` |
| | Algo pequeño que funcione entero | El recorrido completo en el Loom y en el vídeo de respaldo |
| Respuesta de Alex (15/09/2026) | «Cuando nos pases el proyecto final» | Este envío |
| Lo que prometiste tú (16/09/2026) | «El proyecto y el Loom asociado» | Repo + app + Loom |

No piden acceso a GitHub (el repo es público), ni a Vercel, Supabase o Stripe. Tampoco piden un archivo comprimido.

## El paquete

No hay que comprimir nada: el repo público es el paquete. Todo cuelga de dos enlaces:

1. **Repo:** https://github.com/PGC-12thdivision/buddy. El `README.md` enlaza el índice `docs/README.md`.
2. **Documento de entrega:** https://github.com/PGC-12thdivision/buddy/blob/main/docs/entrega/entrega.md. Tiene los accesos, cómo probarlo, la arquitectura, los guardarraíles, el RGPD, los tests, los costes y los criterios uno a uno.

A eso se suman:

3. **App en producción:** https://buddy-xi-eight.vercel.app
4. **Loom:** el enlace que te dé Loom al grabar.
5. *(Opcional)* **Vídeo de respaldo**, sin voz, 4–5 min: `C:\Users\USUARIO\Videos\BUDDY\buddy-demo.webm`. Pesa unos 20 MB: si lo quieres mandar, súbelo a Drive y pon el enlace, mejor que adjuntarlo.

## Antes de enviar

- [ ] Loom grabado con `docs/entrega/guion-loom-4min.md` y su enlace copiado. Comprueba que el enlace se abre en una ventana de incógnito: tiene que ser visible para «cualquiera con el enlace».
- [ ] La app de prod abre (si Supabase tarda, puede que el proyecto Free esté en pausa: reanúdalo en el panel).
- [ ] Sustituye `[ENLACE DEL LOOM]` en el borrador.

## El correo

Hay un borrador ya creado en tu Gmail, como respuesta al hilo «Retomo el proyecto final del Vibe Code Builder» (para Alex, con copia a Stefano). Solo tienes que poner el enlace del Loom y enviarlo. El texto:

> **Asunto:** BUDDY: mi proyecto final del Vibe Code Builder
>
> Hola, Alex; hola, Stefano:
>
> Como os dije, aquí tenéis el proyecto final y su Loom.
>
> BUDDY es una web app para quien entrena solo en el gimnasio. Un wizard genera un plan con IA a partir de tu foco, tus días, las máquinas de tu gimnasio y tus limitaciones. Después, unas reglas deterministas te dicen en cada sesión qué peso toca. La IA elige los ejercicios, pero nunca toca las cargas.
>
> - Loom (4 min): [ENLACE DEL LOOM]
> - App en producción: https://buddy-xi-eight.vercel.app
> - Repo (público): https://github.com/PGC-12thdivision/buddy
> - Documento de entrega, con los criterios uno a uno: https://github.com/PGC-12thdivision/buddy/blob/main/docs/entrega/entrega.md
>
> El PRD está revisado con GStack, el plan está hecho con Compound Engineering y el build, con Claude Code. Usa Next.js en Vercel, Supabase con RLS, Stripe en modo test y Resend. Hay más de mil tests y pruebas de extremo a extremo con Playwright.
>
> Un aviso: sin dominio propio, el correo de confirmación del registro solo llega a mi equipo de Supabase. Si queréis probar la app por dentro, decídmelo y os preparo una cuenta.
>
> ¡Gracias por todo!
>
> Un abrazo,
> Pablo
