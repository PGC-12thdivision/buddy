import { CtaLink } from "@/components/wizard/ui";

// 404 en español con la marca (auditoría de diseño 18/11): antes salía la página de Next en inglés.
export default function NotFound() {
  return (
    <div className="wz-frame">
      <div className="wz-column">
        <header className="wz-band wz-pad py-8" data-sober="" aria-label="Marcador">
          <span className="wz-tag mb-3">Game over</span>
          <h1 className="wz-title">Esta pantalla no existe</h1>
          <p className="wz-subtitle">O todavía no la hemos construido.</p>
        </header>
        <main className="wz-pad relative flex flex-1 flex-col items-center justify-center overflow-hidden py-10 text-center" aria-label="Página no encontrada">
          <span className="wz-watermark" aria-hidden="true">
            404
          </span>
          <p className="relative m-0 mb-6 text-[17px]">Vuelve al inicio y sigue donde lo dejaste.</p>
          <div className="relative w-full max-w-sm">
            <CtaLink href="/">Volver al inicio</CtaLink>
          </div>
        </main>
      </div>
    </div>
  );
}
