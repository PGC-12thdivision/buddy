import { formatKg, MAX_CALIBRATION_SETS } from "@/lib/domain/session";

// Lista de series del ejercicio en curso (feedback de Pablo, 18/11): cada serie con su peso, sus
// repeticiones y su estado, en la sesión normal y en la calibración. Solo presenta lo guardado: las
// cargas siguen saliendo de las reglas deterministas (guardarraíl 3).

type Logged = { id: string; setIndex: number; weightKg: number; reps: number; rir: number | null; status: "hecha" | "saltada" | "detenida" };

export type SetRow =
  | { n: number; state: "hecha"; id: string; weightKg: number; reps: number; rir: number | null; answer: string | null }
  | { n: number; state: "ahora" }
  | { n: number; state: "pendiente" };

// Respuesta de una serie de prueba: "Quedaban 2", "Quedaban 4+" o "No llegó" si hizo menos del objetivo.
export function calibrationAnswer(rir: number | null, reps: number, targetReps: number): string {
  if (reps < targetReps) return "No llegó";
  return rir !== null && rir >= 4 ? "Quedaban 4+" : `Quedaban ${rir ?? 0}`;
}

// Series hechas en orden, la que toca ahora y las que faltan. En calibración no hay pendientes: el
// número de pruebas depende de las respuestas (hasta MAX_CALIBRATION_SETS).
export function setRows(own: readonly Logged[], plannedSets: number, calibration: { targetReps: number } | null): SetRow[] {
  const done = own.filter((s) => s.status === "hecha").sort((a, b) => a.setIndex - b.setIndex);
  const rows: SetRow[] = done.map((s, i) => ({
    n: i + 1,
    state: "hecha",
    id: s.id,
    weightKg: s.weightKg,
    reps: s.reps,
    rir: s.rir,
    answer: calibration ? calibrationAnswer(s.rir, s.reps, calibration.targetReps) : null,
  }));
  if (calibration) {
    if (done.length < MAX_CALIBRATION_SETS) rows.push({ n: done.length + 1, state: "ahora" });
    return rows;
  }
  for (let n = done.length + 1; n <= plannedSets; n++) rows.push(n === done.length + 1 ? { n, state: "ahora" } : { n, state: "pendiente" });
  return rows;
}

// Texto completo de una fila para lectores de pantalla, sin puntos medios (DESIGN.md §1).
export function setRowLabel(row: SetRow, noun: "Serie" | "Prueba"): string {
  if (row.state === "ahora") return `${noun} ${row.n}: la que toca ahora`;
  if (row.state === "pendiente") return `${noun} ${row.n}: pendiente`;
  const base = `${noun} ${row.n}: ${formatKg(row.weightKg)} kg, ${row.reps} ${row.reps === 1 ? "repetición" : "repeticiones"}`;
  return `${base}${row.answer ? `, ${row.answer.toLowerCase()}` : ""}, hecha. Tocar para corregirla`;
}
