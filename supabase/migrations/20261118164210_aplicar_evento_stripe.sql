-- U9: aplicar un evento de Stripe en una sola transacción (plan.md KTD8 y KTD16). Guarda el
-- event.id en stripe_events y escribe en account_status el estado de la suscripción que el
-- servidor acaba de pedir a Stripe. Si algo falla, no queda ni el evento ni el cambio, y el
-- reintento de Stripe se procesa. Patrón de KTD16: lógica en private con search_path vacío y
-- envoltorio en public que solo puede ejecutar service_role.
--
-- Devuelve:
-- - 'cliente_desconocido': el cliente de Stripe no es de esta base (staging y prod comparten la
--   cuenta de test). No guarda nada.
-- - 'duplicado': el evento ya se aplicó. No cambia nada.
-- - 'aplicado': evento guardado y estado actualizado.
create function private.apply_stripe_event(
  p_event_id text, p_customer_id text, p_subscription_id text, p_status text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  -- Bloquea la fila del usuario: dos eventos del mismo cliente se aplican de uno en uno.
  select user_id into v_user
  from public.account_status
  where stripe_customer_id = p_customer_id
  for update;

  if v_user is null then
    return 'cliente_desconocido';
  end if;

  insert into public.stripe_events (event_id) values (p_event_id) on conflict (event_id) do nothing;
  if not found then
    return 'duplicado';
  end if;

  update public.account_status
  set subscription_status = p_status, stripe_subscription_id = p_subscription_id, updated_at = now()
  where user_id = v_user;

  return 'aplicado';
end;
$$;
revoke execute on function private.apply_stripe_event(text, text, text, text) from public, anon, authenticated;
grant execute on function private.apply_stripe_event(text, text, text, text) to service_role;

create function public.apply_stripe_event(
  p_event_id text, p_customer_id text, p_subscription_id text, p_status text
)
returns text
language sql
security definer
set search_path = ''
as $$
  select private.apply_stripe_event(p_event_id, p_customer_id, p_subscription_id, p_status);
$$;
revoke execute on function public.apply_stripe_event(text, text, text, text) from public, anon, authenticated;
grant execute on function public.apply_stripe_event(text, text, text, text) to service_role;
