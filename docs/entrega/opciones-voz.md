# Opciones para la narración del Loom

Fecha: 20/11/2026. Hay cuatro opciones, ordenadas de más a menos recomendada. No pongo precios: no los he podido verificar hoy.

## 1. Pablo graba en Loom siguiendo el guion (recomendada)

Pablo hace la demo en directo en producción y la narra con `docs/entrega/guion-loom-4min.md`.

- **Pros:**
  - Es lo que se comprometió con Alex ("proyecto + Loom") y lo que se espera en un bootcamp: que el autor explique su trabajo.
  - Se oye su voz real, con su seguridad y su criterio, y en un solo paso.
  - Demuestra que la app de producción funciona de verdad.
  - No hay que montar nada después ni enviar datos a terceros, aparte de Loom.
- **Contras:**
  - Puede fallar algo en directo: la generación con IA, el webhook de Stripe o el proyecto de Supabase en pausa. Por eso conviene tener dos cuentas preparadas (ver la checklist del guion).
  - Suele hacer falta más de una toma para no pasar de 4 minutos.

## 2. Vídeo pregrabado y la voz de Pablo en off

Se usa el vídeo de `scripts/demo/grabar.mjs`, grabado contra staging a 390×844. Pablo lo pone a pantalla completa y graba su voz encima con Loom (pantalla y micro), leyendo los subtítulos de `docs/entrega/demo.srt` como apoyo.

- **Pros:**
  - La demo sale limpia y siempre igual, sin esperas ni fallos en directo.
  - El ritmo es fijo, y los subtítulos marcan cuándo decir cada cosa.
  - Sirve de respaldo aunque se elija la opción 1.
- **Contras:**
  - Está grabado en staging, no en producción. Hay que decirlo en el vídeo.
  - El vídeo no incluye el pago con Stripe ni el check-in del coach: esas partes se cuentan con la pantalla de Premium o se graban aparte.
  - Hay que ajustar lo que se dice al ritmo del vídeo; si no, se pisa.
  - Es webm: en este equipo no hay un ffmpeg completo para pasarlo a mp4. Loom lo graba igual si se reproduce en el navegador.

## 3. Voz sintética local (Windows, sin salir del equipo)

Windows trae la voz española **Microsoft Helena Desktop (es-ES)** de System.Speech (SAPI), y está instalada en este equipo. Puede leer el guion y guardar un .wav sin internet.

- **Pros:**
  - Sin coste y sin enviar datos a nadie.
  - Se repite igual cada vez.
  - No hace falta grabar.
- **Contras:**
  - Suena claramente robótica, por la calidad de las voces SAPI de escritorio, y quita credibilidad a un proyecto que se presenta como personal.
  - En un bootcamp se espera que hable el autor.
  - Para juntar la voz con el vídeo hace falta un editor, como Clipchamp (viene con Windows 11) o ffmpeg. El ffmpeg que trae Playwright no tiene códecs de audio ni salida mp4, así que no sirve.
- **Prueba hecha el 20/11:**
  - Se generó un .wav por escena con Helena, con el texto de los subtítulos.
  - Se unieron en una pista, `narracion-prueba.wav` (4:39, PCM mono a 22 kHz), colocando cada trozo en el segundo de su escena según `escenas.json`. Solo una escena entra con 3,6 s de retraso.
  - No se pudo mezclar con el vídeo: aquí no hay un ffmpeg con audio. Para unirlos, hay que abrir los dos archivos en Clipchamp y alinearlos al segundo 0.

## 4. Clonar la voz de Pablo con un servicio de terceros (no recomendada)

Se sube una muestra de la voz de Pablo a un proveedor externo de síntesis de voz, y el proveedor genera la narración del guion con su voz.

- **Pros:**
  - Suena parecido a Pablo sin tener que grabar cada toma.
- **Contras:**
  - **Requiere el consentimiento expreso de Pablo** y subir su voz a un proveedor externo, fuera de su control.
  - **La voz es un dato biométrico según el RGPD.** Cuando se trata para identificar a una persona, es categoría especial (art. 9). Antes habría que revisar la política de privacidad y de retención del proveedor, dónde guarda los datos y si los usa para entrenar sus modelos.
  - Choca con el espíritu del proyecto, que cuida el mínimo dato y no envía a terceros nada que no haga falta.
  - Una voz clonada en una presentación personal puede verse como poco honesta si no se avisa.
  - Coste: no lo he verificado.
  - En este trabajo no se ha usado ni probado ningún servicio externo de voz.

## Recomendación

La **opción 1**, con la **2** preparada como respaldo. La 3 solo para una prueba interna de tiempos. La 4 no merece el riesgo para una entrega de bootcamp.
