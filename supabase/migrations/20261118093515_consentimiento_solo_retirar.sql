-- Consentimientos: el usuario solo puede retirar uno vigente, nunca reescribirlo (revisión de
-- código de U2/U4, 18/11). Antes podía cambiar cualquier columna de sus filas: la versión, la
-- fecha en que lo dio o volver a poner withdrawn_at a null. El registro del consentimiento es la
-- prueba de que se dio (guardarraíl 8): solo cambia withdrawn_at, y solo de null a una fecha.

drop policy "retirar el propio" on public.consents;

create policy "retirar el propio" on public.consents for update to authenticated
  using ((select auth.uid()) = user_id and withdrawn_at is null)
  with check ((select auth.uid()) = user_id and withdrawn_at is not null);

revoke update on public.consents from authenticated;
grant update (withdrawn_at) on public.consents to authenticated;
