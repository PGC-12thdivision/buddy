-- U11: Ajustes, preferencias (diseño D15; DESIGN.md D61).

-- Tema claro por defecto (D61). Hasta U11 nada permitía elegir el tema, así que el "system" de las
-- filas existentes es el valor por defecto de la tabla, no una elección: pasa a "light".
alter table public.user_settings alter column theme set default 'light';
update public.user_settings set theme = 'light' where theme = 'system';

-- El usuario solo cambia sus preferencias, nunca el user_id de la fila.
revoke update on public.user_settings from authenticated;
grant update (theme, show_rest_timer, updated_at) on public.user_settings to authenticated;
