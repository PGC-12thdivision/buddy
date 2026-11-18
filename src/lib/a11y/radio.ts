// Teclado de los grupos de opciones (WAI-ARIA radiogroup; auditoría de diseño del 18/11).
// - Las flechas parten del botón con el foco (o, si no lo hay, de la opción elegida) y dan la vuelta.
// - Sin respuesta todavía, solo mueven el foco: elegir es una decisión activa con espacio o Enter
//   (diseño D6). Así una flecha nunca marca «Sí» en el cribado por accidente.
// - Con una respuesta ya elegida, mover es elegir (patrón habitual de radiogroup).

const STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

export type RadioMove = { index: number; select: boolean };

export function radioKeyMove(length: number, selectedIndex: number, focusedIndex: number, key: string): RadioMove | null {
  const step = STEPS[key];
  if (!step || length === 0) return null;
  const from = focusedIndex >= 0 ? focusedIndex : selectedIndex >= 0 ? selectedIndex : 0;
  return { index: (from + step + length) % length, select: selectedIndex >= 0 };
}
