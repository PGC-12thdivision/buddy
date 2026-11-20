import type { CSSProperties } from "react";
import { DRAWINGS } from "@/lib/app/exercise-drawings";

// Dibujos de técnica (feedback de Pablo, 18/11: "que parezca una persona en la máquina de verdad").
// Ilustraciones de Everkinetic (CC BY-SA 4.0) adaptadas: solo el trazo, como máscara, para pintarlo con
// la tinta del tema (claro y oscuro). Dos fotogramas: cómo empiezas (papel) y adónde llegas (celda
// limón, como la pestaña activa), unidos por la flecha morada (DESIGN.md §2).

const CREDIT_URL = "https://github.com/everkinetic/data";
const LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/deed.es";

const art = (file: string): CSSProperties => {
  const url = `url("/ejercicios/${file}")`;
  return { maskImage: url, WebkitMaskImage: url };
};

export function ExerciseFigure({ exerciseId, name }: { exerciseId: string; name: string }) {
  const drawing = DRAWINGS[exerciseId];
  if (!drawing) return null;
  return (
    <figure className="ss-drawing">
      <div className="ss-drawing-frames" role="img" aria-label={`${name}: posición con la que empiezas y posición a la que llegas.`}>
        <div className="ss-frame">
          <span className="ss-frame-tag" aria-hidden="true">
            1 · Empiezas
          </span>
          <span className="ss-frame-art" style={art(drawing.start)} />
        </div>
        <span className="ss-drawing-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M3 12H19M13 6L19 12L13 18" />
          </svg>
        </span>
        <div className="ss-frame" data-end="">
          <span className="ss-frame-tag" aria-hidden="true">
            2 · Llegas y vuelves
          </span>
          <span className="ss-frame-art" style={art(drawing.end)} />
        </div>
      </div>
      <figcaption>
        {drawing.similar ? "Variante parecida. " : null}
        Dibujo:{" "}
        <a href={CREDIT_URL} target="_blank" rel="noreferrer">
          Everkinetic
        </a>
        ,{" "}
        <a href={LICENSE_URL} target="_blank" rel="noreferrer">
          CC BY-SA 4.0
        </a>
        , adaptado.
      </figcaption>
    </figure>
  );
}

// Miniatura para la fila "Cómo se hace": la posición a la que llegas.
export function ExerciseThumb({ exerciseId }: { exerciseId: string }) {
  const drawing = DRAWINGS[exerciseId];
  if (!drawing) return null;
  return (
    <span className="ss-thumb" aria-hidden="true">
      <span className="ss-frame-art" style={art(drawing.end)} />
    </span>
  );
}
