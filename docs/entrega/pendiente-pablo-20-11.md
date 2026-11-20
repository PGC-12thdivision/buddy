# Decisiones y pasos pendientes para Pablo (20/11/2026)

Estado tras la sesión de decisiones de la tarde del 20/11.

## Hecho

| Punto | Resultado |
|---|---|
| Alta en prod | **Se deja como está** ("Confirm email" activado). Los evaluadores no se registran. Pablo es miembro del equipo de Supabase, así que su correo de confirmación sí llega. El código también funciona si algún día se desactiva la confirmación |
| Webhook de Stripe en prod | Endpoint dado de alta en modo test con los 4 eventos (comprobado por la API de Stripe). `STRIPE_WEBHOOK_SECRET` está en Production: un POST sin firmar responde 400 en vez de 500 |
| Términos | Página pública `/terminos`: aviso médico, uso, premium y pagos, datos de salud (RGPD), responsabilidad y ley aplicable. Enlazada desde la bienvenida, el registro y Ajustes (PR #27 y #28) |
| Restos cosméticos | Título del Plan según los días reales (D68), "Quedaban 4+" en una línea a 320 px y pop de fin sobre el titular (PR #29) |
| Artefacto "Sala de Máquinas" | Privado (comprobado) |
| Usuario de prueba de staging | Borrado (comprobado) |

## Pendiente

1. **Customer portal de Stripe (modo test).** Funciona: el 20/11 se abrió una sesión del portal con un cliente de prueba. La API no deja leer si permite cancelar; si en la prueba del punto 2 no aparece "Cancelar", actívalo en Stripe → Settings → Billing → Customer portal.
2. **Pago de prueba de punta a punta en prod.** Tienes que hacerlo tú, porque Claude no introduce datos de tarjeta en prod:
   - Premium → tarjeta `4242 4242 4242 4242` → la vuelta dice que ya eres premium;
   - después, Ajustes → Gestionar.
3. **Responsable y contacto en `/terminos`.** La página no identifica a nadie, porque el repo es público. Para uso real hacen falta un nombre y un email de contacto (LSSI/RGPD).
4. **Revisión de textos del catálogo por tu equipo** (PR #20).
5. **Aviso informativo de Supabase.** `rls_auto_enable()` la creó la plataforma. Riesgo bajo; se puede revocar `EXECUTE` en una migración después de la entrega.
