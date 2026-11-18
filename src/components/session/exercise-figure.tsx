import { arrowPaths, ILLUSTRATIONS, illustrationKey, VIEWBOX, type Illustration } from "@/lib/app/illustrations";

// Dibujo de técnica de un ejercicio (por su patrón de movimiento). Trazos de 2,5 px que no escalan,
// tinta para el cuerpo, discontinuo para la posición inicial, flecha morada y carga en limón con borde
// de tinta (el limón nunca va como trazo sobre fondo claro; DESIGN.md §2).
export function ExerciseFigure({ pattern, region, className }: { pattern: string; region: string; className?: string }) {
  const figure: Illustration = ILLUSTRATIONS[illustrationKey(pattern, region)];
  return (
    <svg
      className={`ss-figure${className ? ` ${className}` : ""}`}
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      role="img"
      aria-label={figure.label}
    >
      <g className="ss-figure-props">
        {figure.props?.map((d) => <path key={d} d={d} />)}
      </g>
      <g className="ss-figure-ghost">
        {figure.ghost?.map((d) => <path key={d} d={d} />)}
      </g>
      <g className="ss-figure-body">
        {figure.body.map((d) => <path key={d} d={d} />)}
        <circle cx={figure.head[0]} cy={figure.head[1]} r={6} />
      </g>
      <g className="ss-figure-load">
        {figure.loads?.map(([x, y]) => <rect key={`${x}-${y}`} x={x - 4} y={y - 4} width={8} height={8} rx={1} />)}
      </g>
      <g className="ss-figure-arrow">
        {figure.arrows.map((arrow, i) => {
          const { line, heads } = arrowPaths(arrow);
          return <path key={i} d={line + heads.join("")} />;
        })}
      </g>
    </svg>
  );
}
