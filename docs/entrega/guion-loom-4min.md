# Guion del Loom: BUDDY en 4 minutos

Para grabar el 21/11/2026 (actualizado tras el debate de etiquetas del 20/11). Unas 580 palabras habladas, a unas 150 por minuto. El texto entre comillas se dice tal cual, pero sin leerlo: es mejor que suene a ti que a guion. Si un bloque se alarga, recorta del bloque 6 ("Cómo lo construí"), no de la demo.

- **URL de la demo:** producción, https://buddy-xi-eight.vercel.app
- **Cuenta:** una de demo preparada de antemano (ver la checklist del final). Sin dominio propio, el email de confirmación solo te llega a ti (D7, D34).
- **Vídeo de respaldo:** si la app falla en directo, usa el vídeo grabado con `scripts/demo/grabar.mjs` (contra staging) y pon la voz encima. Tienes los subtítulos en `docs/entrega/demo.srt`.

---

## 1. Problema y para quién (0:00–0:25)

**Pantalla:** bienvenida de BUDDY (`/`), en el móvil de DevTools.
**Ratón:** quieto. Al final, señala el aviso "BUDDY no es consejo médico…".

> "Hola, soy Pablo y esto es BUDDY, mi proyecto final del Vibe Code Builder. Es para quien entrena solo en el gimnasio y no sabe qué rutina seguir ni cuándo subir peso. Un entrenador personal es caro, y las apps genéricas no conocen ni las máquinas de tu gimnasio ni tus limitaciones. Y lo primero que ves es esto: BUDDY no es consejo médico."

## 2. Alta, wizard, cribado y plan con IA (0:25–1:15)

**Pantalla:** `/foco` → `/experiencia` → `/semana` → `/deportes` → `/gimnasio` → `/registro` → `/consentimiento` → `/limitaciones` → `/seguridad` → `/resumen` → `/generando` → `/plan`.
**Ratón:** pulsa "Empezar" y responde rápido: Más músculo, de 6 meses a 2 años, 3 días y 45 minutos, Pádel y el preset Completo. En el registro no hace falta teclear en directo: corta a la cuenta ya confirmada. Marca la casilla del consentimiento despacio, elige "Rodilla", responde el cribado (Sí solo en la pregunta articular) y pulsa "Generar mi plan". En el plan, abre "Ajustado a las zonas que marcaste · Ver qué hemos quitado", deja que se lea y baja despacio con la rueda. Si alguna fila lleva la etiqueta gris "Trabaja un poco: …", señálala.

> "El alta es una pregunta por pantalla: mi foco, mi experiencia, cuántos días tengo, si hago otro deporte y qué máquinas hay en mi gimnasio. Luego creo la cuenta, solo para mayores de 18.
>
> Hasta aquí no me ha pedido nada de salud. Antes de hacerlo, pide consentimiento explícito, con la casilla sin marcar. Marco la rodilla como limitación y paso el cribado: un sí de riesgo bloquea el plan, y la pregunta articular me obliga a marcar la zona.
>
> Genero el plan. Claude elige los ejercicios, pero solo de un catálogo cerrado, y sin ver nada de mi salud. La rodilla se aplica después, en código: ningún ejercicio del plan carga la rodilla. Y no lo hace a escondidas: aquí me dice qué ha quitado, que es porque carga la rodilla, y qué tengo en su lugar. Si un ejercicio solo trabaja un poco una zona que marqué, lleva esta etiqueta gris y un aviso de técnica en la sesión. Las etiquetas de cada ejercicio las revisó un panel de seis expertos simulados con agentes, y ante la duda, el ejercicio sale."

**Si no hay etiqueta gris en tu plan,** quita la frase de la etiqueta: depende de los ejercicios que elija la IA. Con la rodilla, la llevan el gemelo en prensa y el gemelo sentado; con "Espalda baja", el remo sentado en polea y el remo en polea con agarre ancho ("Trabaja un poco: zona lumbar"). El vídeo de respaldo enseña el bloque abierto.

## 3. La sesión del día: calibración y peso por reglas (1:15–2:00)

**Pantalla:** `/hoy` → `/sesion/[id]`.
**Ratón:** pulsa el botón de la sesión en Hoy y "Empezar". Enseña el dibujo de técnica. En la calibración pulsa "Serie hecha" y responde "4+". En la segunda prueba, responde "2". Señala el peso fijado.

> "Esto es Hoy, la sesión que toca. La primera es de calibración, porque la IA no adivina cuánto levanto. Cada ejercicio trae su técnica dibujada. Hago la serie de prueba y me pregunta cuántas más podría haber hecho. Si digo cuatro o más, sube un salto real de la máquina. Si digo dos, el peso queda fijado.
>
> Esto es lo más importante de BUDDY: la IA nunca toca las cargas. Los pesos los calculan funciones puras, con tests, usando la doble progresión: cuando completo el rango dos sesiones seguidas, la siguiente sesión me propone el siguiente peso. Y eso es gratis para todo el mundo."

## 4. Molestia (2:00–2:20)

**Pantalla:** sesión, siguiente ejercicio.
**Ratón:** pulsa "Tengo molestia", deja que se lea la hoja y pulsa "Parar este ejercicio".

> "Si algo duele, el botón Molestia está siempre a la vista. El ejercicio se para hoy, sin subir carga, y queda marcado. Nunca se empuja. Si se repite en la siguiente sesión, me recomienda ver a un profesional y me ofrece añadir la zona a mis limitaciones."

## 5. Coach premium, prueba de 14 días y Stripe (2:20–2:55)

**Pantalla:** fin de sesión → `/premium` → Stripe Checkout (modo test) → vuelta a la app. Si ya tienes un check-in hecho con la cuenta de demo, enséñalo en `/checkin`.
**Ratón:** en Premium, pulsa "Hazte premium". En Checkout, escribe la tarjeta 4242 4242 4242 4242, una fecha futura y cualquier CVC. Paga y espera a que la vuelta diga que ya eres premium.

> "Lo de pago son las funciones con IA. La primera es el coach del check-in semanal: le cuento cómo me he sentido, con escalas y nunca con texto libre, y me propone un ajuste de volumen dentro de topes que valida el código. Yo decido si lo aplico. Al registrarte tienes 14 días de prueba. Para seguir, pagas con Stripe; aquí, en modo test. El webhook actualiza mi estado en Supabase y el acceso es inmediato."

## 6. Cómo lo construí (2:55–3:40)

**Pantalla:** el repo de GitHub (https://github.com/PGC-12thdivision/buddy) → `docs/entrega/entrega.md`, en el diagrama de arquitectura.
**Ratón:** baja despacio por el diagrama y por la tabla de guardarraíles.

> "Lo he construido con Claude Code, por fases: el PRD revisado con GStack, el diseño y un plan de unidades con Compound Engineering.
>
> Usa Next.js en Vercel y Supabase para la autenticación y Postgres, con RLS en todas las tablas: cada usuario solo ve sus datos. La IA solo se llama desde el servidor, y toda su salida se valida con zod contra el catálogo y contra los topes de volumen. Si no valida, se reintenta, y nunca se guarda una respuesta sin validar.
>
> Por el RGPD, no guardo las respuestas del cribado, no hay datos de salud ni en los prompts ni en los logs, y si retiras el consentimiento se borran.
>
> Hay más de mil tests unitarios, tests de RLS contra staging y scripts de extremo a extremo con Playwright."

## 7. Cierre (3:40–4:00)

**Pantalla:** vuelve a Hoy en la app.
**Ratón:** quieto.

> "Queda fuera, y está en el TODOS, el dominio propio para que los emails lleguen a cualquiera y la revisión legal antes de abrirlo a usuarios reales. Eso es BUDDY: la IA elige los ejercicios; las reglas, los pesos. Gracias."

---

## Versión de 60 segundos (respaldo)

Para cuando haya que recortar o si Loom corta. Pantallas: bienvenida → plan → sesión de calibración → Molestia → Premium. Unas 150 palabras.

> "Soy Pablo y esto es BUDDY. Es para quien entrena solo en el gimnasio y no sabe qué rutina seguir ni cuándo subir peso. No es consejo médico.
>
> En cinco minutos respondes un wizard, das tu consentimiento antes de cualquier dato de salud y pasas un cribado. Claude genera tu plan, pero solo con ejercicios de un catálogo cerrado, validado con zod, y sin ver tus limitaciones: esas se aplican después en código.
>
> La primera sesión calibra tu peso. A partir de ahí, la IA nunca toca las cargas: unas reglas con tests te dicen qué peso toca. Si algo duele, Molestia para el ejercicio y no sube nada.
>
> El coach premium tiene 14 días de prueba y se paga con Stripe. Por debajo hay Next.js, Supabase con RLS y más de mil tests. Gracias."

---

## Antes de grabar (checklist)

- [ ] **URL de prod:** https://buddy-xi-eight.vercel.app abre y la sesión de la cuenta de demo está iniciada. Si Supabase tarda en responder, puede que el proyecto Free esté en pausa: revísalo primero.
- [ ] **Cuenta de demo preparada:** registro hecho y email confirmado (solo te llega a ti, D7). Lo más seguro es dejar dos cuentas listas:
  - [ ] **Cuenta A, recién confirmada:** se queda en el consentimiento, para grabar en directo el consentimiento, las limitaciones, el cribado y la generación del plan.
  - [ ] **Cuenta B, con el plan ya generado:** para la sesión de calibración, la Molestia y Premium, si la generación tarda en directo.
- [ ] **Generación con IA:** la cuenta A tiene libre su generación (gratis: 1 plan y 1 cambio al mes). No regeneres antes de grabar.
- [ ] **Stripe:** la cuenta que va a pagar todavía no es premium de pago. Tarjeta de test: `4242 4242 4242 4242`, fecha futura y cualquier CVC. Comprueba antes que el webhook de prod está configurado: si no, la vuelta se queda esperando. El webhook de prod está dado de alta y verificado (20/11).
- [ ] **Tema:** claro, que es el tema por defecto (D61) y se lee mejor en vídeo. El oscuro solo si quieres enseñarlo un segundo en Ajustes.
- [ ] **Navegador:** Chrome en una ventana limpia (perfil sin extensiones ni marcadores a la vista) y zoom al 100 %.
- [ ] **Viewport móvil:** DevTools → modo dispositivo, 390 × 844 (iPhone 12/13/14) y DPR 2. Esconde el panel de DevTools para que no salga en el vídeo.
- [ ] **Loom:** graba solo la pestaña o la ventana, con la cámara en una esquina que no tape la barra inferior de la app. Micro probado.
- [ ] **Notificaciones silenciadas:** Windows en "No molestar", y Slack, el correo y WhatsApp cerrados.
- [ ] **Pestañas preparadas,** en este orden: la app (bienvenida), Stripe Checkout (se abre sola), el repo de GitHub y `docs/entrega/entrega.md`.
- [ ] **Ensayo:** un ensayo cronometrado. Si pasa de 4:15, recorta el bloque 6.
