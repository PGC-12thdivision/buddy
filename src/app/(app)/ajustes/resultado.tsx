import { Note } from "@/components/wizard/ui";

// Aviso tras el refiltrado determinista (diseño D15; D35): qué ha cambiado y los huecos vacíos.
export function RefilterNote({ changed, holes }: { changed: number; holes: number }) {
  const what =
    changed === 0
      ? "Tu plan no necesitaba cambios."
      : `Plan actualizado: ${changed === 1 ? "ha cambiado 1 ejercicio" : `han cambiado ${changed} ejercicios`}.`;
  return (
    <Note tone={holes > 0 ? "warn" : "ok"} role="status">
      <p className="m-0">
        <b>Guardado.</b> {what}
      </p>
      {holes > 0 ? (
        <p className="m-0 mt-1">
          {holes === 1 ? "Queda 1 hueco vacío" : `Quedan ${holes} huecos vacíos`}: ningún ejercicio encaja con tu equipo y tus limitaciones.
          Nunca te proponemos uno que cargue una zona limitada.
        </p>
      ) : null}
    </Note>
  );
}
