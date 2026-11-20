-- U7, revisión de código del 18/11 (D64): el cliente no puede fijar cargas ni reabrir sesiones.

-- Una sesión cerrada no se reabre: ended_at solo pasa de vacío a una fecha, y una vez.
create function private.workout_sessions_cerrar_una_vez()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.ended_at is not null and new.ended_at is distinct from old.ended_at then
    raise exception 'sesion_cerrada' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function private.workout_sessions_cerrar_una_vez() from public, anon, authenticated;

create trigger workout_sessions_cerrar_una_vez
  before update of ended_at on public.workout_sessions
  for each row execute function private.workout_sessions_cerrar_una_vez();

-- El usuario corrige peso, repeticiones y RIR, pero no el estado: una fila "detenida" (Molestia)
-- no puede pasar a "hecha" (guardarraíl 7). Deshacer borra la fila.
revoke update on public.set_logs from authenticated;
grant update (weight_kg, reps, rir) on public.set_logs to authenticated;

-- La carga de trabajo y la calibración las escribe solo el servidor tras sus comprobaciones
-- (guardarraíl 3). El usuario sigue pudiendo leer su estado.
revoke insert, update on public.exercise_state from authenticated;
