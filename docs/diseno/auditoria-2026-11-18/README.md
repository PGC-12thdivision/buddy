# Auditoría de diseño del 18/11/2026

Pedida por Pablo: validar el diseño y la estética de la app y ver dónde mejorar sin perder el hilo "Venice 89 × arcade", elevándolo a una app de 2026.

## Cómo se hizo

- **Herramientas** (gratis y de código abierto; se leyeron sus guías, no se ejecutaron sus scripts):
  - Taste Skill ([Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill), MIT).
  - Web Interface Guidelines de Vercel, vía [vercel-labs/claude-skills](https://github.com/vercel-labs/claude-skills), skill `web-design-guidelines`.
  - Referencias de [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md), MIT.
  - Capturas a 360×640, 768 y 1280 px con [Playwright CLI](https://github.com/microsoft/playwright-cli), Apache-2.0.
- **Image-to-code:** esa skill ya no está en el repo de Taste Skill (se movió). La comparación con el prototipo se hizo sobre su CSS.
- **Dos auditorías independientes:** A (gusto y elevación a 2026) y B (calidad de interfaz y accesibilidad). Los informes completos están en esta carpeta.

## Ya aplicado (rama `feature/s2-diseno`)

Defectos y victorias rápidas que no cambian ninguna decisión, salvo la tipografía pixelada (D58):

- **Tildes de la letra pixelada:** Silkscreen en lugar de Press Start 2P (D58). Ver `fuentes-pixel.png`.
- **Foco visible sobre el morado:** anillo limón en el marcador y el menú lateral. El morado sobre morado daba 1,4:1.
- **Pie fijo:** fundido de 16 px para que no corte el contenido en seco, y respeto a la zona segura de iOS.
- **CTA de la app en escritorio:** 420 px como máximo, en lugar de 1000.
- **Pasada "anti app genérica" del prototipo (§4 bis), que el código no había recogido:**
  - tarjetas transparentes;
  - avisos entre filetes, sin caja;
  - marcador propio en los chips;
  - casillas propias;
  - CTA desactivado a guiones;
  - `:hover` y `:active` con `steps()`.
- **Filas del plan y de Hoy:** la cifra no se parte.
- **Teclado:** flechas en los grupos de opciones (radiogroup); foco al primer error del registro; nombre correcto de "Responder" en el resumen.
- **404 en español** con la marca.
- **Fuera del diseño:** entrar con un plan activo lleva a Hoy, no al resumen.

## Para que decida Pablo

1. **Dirección de elevación 2026** (informe A, sección "Direcciones de elevación"):
   - A, "HUD de recreativa";
   - **B, "Revista de Venice"** (la recomendada): una cifra de portada por pantalla, reglas de imprenta y el arcade reservado a los logros;
   - C, "Muscle Beach de noche" (oscuro primero).
2. **Pestaña activa de la barra inferior:** DESIGN.md §5 pide una barra limón sobre crema, y §2 lo prohíbe por contraste. La propuesta es la celda en limón con texto en tinta. Hay que cambiar §5.
3. **Hoy con protagonista:** cifras grandes (ejercicios y minutos), la tira de la semana y las 2 columnas de escritorio de D24.
4. **Tema oscuro:** los tokens existen, pero nada lo activa. Su sitio es Ajustes (U11).
5. **D58:** confirmar Silkscreen o elegir Tiny5 o Pixelify Sans, con la comparativa a la vista.

## Pendiente técnico que salió en la auditoría

- `/sesion` no existe hasta U7: el CTA "Empezar calibración" lleva ahora a la 404 en español.
- No hay `loading.tsx` ni `error.tsx` por ruta.
- Las tres sesiones del plan de prueba empiezan por "Gemelo en máquina". Es correcto con una limitación de rodilla (es el único empuje de pierna que no la carga), pero conviene pedir variedad en el relleno de huecos.
