-- U7: sesión del día, calibración y Molestia (plan.md U7; KTD11; guardarraíles 3, 7 y 8).
-- Revisión de guardarraíles del 18/11 (D63–D66 en docs/01-contexto-y-criterios.md).

-- Una sola sesión abierta por usuario: un doble toque en "Empezar" no crea dos.
create unique index workout_sessions_una_abierta on public.workout_sessions (user_id) where ended_at is null;

-- El usuario solo puede cerrar su sesión: no cambia tipo, inicio ni día del plan.
revoke update on public.workout_sessions from authenticated;
grant update (ended_at) on public.workout_sessions to authenticated;

-- Una fila por serie: dos toques con UUID distintos no duplican (KTD11).
create unique index set_logs_una_por_serie on public.set_logs (session_id, exercise_id, set_index);

-- Estado neutro "detenida": el ejercicio se paró hoy. No dice por qué ni la zona, así que no es un
-- dato de salud, pero impide subir carga en la sesión siguiente aunque no haya marca de Molestia
-- (sin consentimiento, o borrada al retirarlo) (guardarraíl 7).
alter table public.set_logs drop constraint set_logs_status_check;
alter table public.set_logs add constraint set_logs_status_check check (status in ('hecha', 'saltada', 'detenida'));

-- Corregir una serie de calibración (diseño D8) incluye su RIR.
grant update (rir) on public.set_logs to authenticated;

-- Una marca de Molestia por ejercicio y sesión.
create unique index discomfort_marks_una_por_sesion on public.discomfort_marks (session_id, exercise_id);
