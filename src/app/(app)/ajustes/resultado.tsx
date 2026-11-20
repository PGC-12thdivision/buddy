import { Note } from "@/components/wizard/ui";
import { changeText, type PlanChange } from "@/lib/domain/exclusion-summary";

// Aviso tras el refiltrado determinista (diseño D15; D35; dictamen del 20/11): qué ha cambiado,
// ejercicio a ejercicio, y por qué zona. La lista solo vive en la respuesta de la acción: al recargar
// desaparece y queda el bloque «Ver qué hemos quitado» de la pantalla del plan.
export function RefilterNote({ changed, holes, changes = [] }: { changed: number; holes: number; changes?: PlanChange[] }) {
  const lines = [...new Set(changes.map(changeText))];
  const what =
    changed === 0
      ? "Tu plan no necesitaba cambios."
      : lines.length > 0
        ? "Plan actualizado:"
        : `Plan actualizado: ${changed === 1 ? "ha cambiado 1 ejercicio" : `han cambiado ${changed} ejercicios`}.`;
  return (
    <Note tone="ok" role="status">
      <p className="m-0">
        <b>Guardado.</b> {what}
      </p>
      {changed > 0 && lines.length > 0 ? (
        <ul className="m-0 mt-1 list-none p-0 text-[14px]">
          {lines.map((line) => (
            <li key={line}>{`· ${line}`}</li>
          ))}
        </ul>
      ) : null}
      {holes > 0 ? (
        <p className="m-0 mt-1 text-[14px]">
          {holes === 1 ? "Queda 1 hueco vacío" : `Quedan ${holes} huecos vacíos`}: lo verás explicado en tu plan. Nunca te proponemos un
          ejercicio que cargue una zona que marcaste.
        </p>
      ) : null}
    </Note>
  );
}
