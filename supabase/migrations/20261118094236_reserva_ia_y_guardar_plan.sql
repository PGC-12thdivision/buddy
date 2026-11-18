-- U5: reserva atómica de una llamada de IA (KTD18) y guardado del plan en una sola transacción
-- (D54). Patrón de KTD16: lógica en private con search_path vacío, envoltorio en public que solo
-- puede ejecutar service_role. El user_id lo pone siempre el servidor, sacado de los claims.

-- Reserva: con un bloqueo por usuario, cuenta y, si cabe, inserta la fila "pending". Dos
-- peticiones a la vez no pueden pasar las dos. Reglas (src/lib/domain/ai-limits.ts):
-- - tope técnico: 20 intentos al día (calendario de Madrid), cuenten o no;
-- - consumen límite las llamadas "ok" y las "pending" más recientes que maxDuration;
-- - plan: una en total; checkin: p_period_limit por semana; el resto: p_period_limit al mes.
create function private.reserve_ai_call(p_user uuid, p_kind text, p_model text, p_period_limit integer, p_max_duration_s integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_local timestamp := v_now at time zone 'Europe/Madrid';
  v_day_start timestamptz := date_trunc('day', v_local) at time zone 'Europe/Madrid';
  v_week_start timestamptz := date_trunc('week', v_local) at time zone 'Europe/Madrid';
  v_month_start timestamptz := date_trunc('month', v_local) at time zone 'Europe/Madrid';
  v_used integer;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('ai_calls:' || p_user::text));

  if (select count(*) from public.ai_calls where user_id = p_user and created_at >= v_day_start) >= 20 then
    return jsonb_build_object('ok', false, 'reason', 'tope_diario');
  end if;

  select count(*) into v_used
  from public.ai_calls
  where user_id = p_user
    and kind = p_kind
    and (outcome = 'ok' or (outcome = 'pending' and created_at > v_now - make_interval(secs => p_max_duration_s)))
    and (
      p_kind = 'plan'
      or (p_kind = 'checkin' and created_at >= v_week_start)
      or (p_kind not in ('plan', 'checkin') and created_at >= v_month_start)
    );

  if v_used >= p_period_limit then
    return jsonb_build_object(
      'ok', false,
      'reason', case p_kind when 'plan' then 'limite_alcanzado' when 'checkin' then 'limite_semanal' else 'limite_mensual' end
    );
  end if;

  insert into public.ai_calls (user_id, kind, model) values (p_user, p_kind, p_model) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
revoke execute on function private.reserve_ai_call(uuid, text, text, integer, integer) from public, anon, authenticated;

create function public.reserve_ai_call(p_user uuid, p_kind text, p_model text, p_period_limit integer, p_max_duration_s integer)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.reserve_ai_call(p_user, p_kind, p_model, p_period_limit, p_max_duration_s);
$$;
revoke execute on function public.reserve_ai_call(uuid, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_call(uuid, text, text, integer, integer) to service_role;
grant execute on function private.reserve_ai_call(uuid, text, text, integer, integer) to service_role;

-- Guardado del plan ya validado: nueva versión activa, sesiones y huecos, y la llamada de IA
-- marcada como "ok" con sus tokens y coste, todo en una transacción. Si algo falla, no queda un
-- plan a medias ni se consume el límite.
-- p_plan: { focus, days_per_week, template, source, sessions: [{ day_index, label,
--           slots: [{ position, pattern, region, exercise_id|null, gap_reason|null, sets|null,
--                     rep_min|null, rep_max|null }] }] }
create function private.save_plan(
  p_user uuid, p_plan jsonb, p_ai_call uuid, p_input_tokens integer, p_output_tokens integer, p_cost_usd numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan uuid;
  v_version integer;
  v_session_row jsonb;
  v_session uuid;
begin
  perform pg_advisory_xact_lock(hashtext('plans:' || p_user::text));

  select coalesce(max(version), 0) + 1 into v_version from public.plans where user_id = p_user;
  update public.plans set is_active = false where user_id = p_user and is_active;

  insert into public.plans (user_id, version, focus, days_per_week, template, source, is_active)
  values (
    p_user, v_version, p_plan ->> 'focus', (p_plan ->> 'days_per_week')::smallint,
    p_plan ->> 'template', p_plan ->> 'source', true
  )
  returning id into v_plan;

  for v_session_row in select value from jsonb_array_elements(p_plan -> 'sessions') loop
    insert into public.plan_sessions (plan_id, user_id, day_index, label)
    values (v_plan, p_user, (v_session_row ->> 'day_index')::smallint, v_session_row ->> 'label')
    returning id into v_session;

    insert into public.plan_slots (plan_session_id, user_id, position, pattern, region, exercise_id, gap_reason, sets, rep_min, rep_max)
    select v_session, p_user, (s ->> 'position')::smallint, s ->> 'pattern', s ->> 'region', s ->> 'exercise_id',
           s ->> 'gap_reason', (s ->> 'sets')::smallint, (s ->> 'rep_min')::smallint, (s ->> 'rep_max')::smallint
    from jsonb_array_elements(v_session_row -> 'slots') as s;
  end loop;

  if p_ai_call is not null then
    update public.ai_calls
    set outcome = 'ok', input_tokens = p_input_tokens, output_tokens = p_output_tokens, cost_usd = p_cost_usd, completed_at = now()
    where id = p_ai_call and user_id = p_user;
  end if;

  return v_plan;
end;
$$;
revoke execute on function private.save_plan(uuid, jsonb, uuid, integer, integer, numeric) from public, anon, authenticated;

create function public.save_plan(
  p_user uuid, p_plan jsonb, p_ai_call uuid, p_input_tokens integer, p_output_tokens integer, p_cost_usd numeric
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.save_plan(p_user, p_plan, p_ai_call, p_input_tokens, p_output_tokens, p_cost_usd);
$$;
revoke execute on function public.save_plan(uuid, jsonb, uuid, integer, integer, numeric) from public, anon, authenticated;
grant execute on function public.save_plan(uuid, jsonb, uuid, integer, integer, numeric) to service_role;
grant execute on function private.save_plan(uuid, jsonb, uuid, integer, integer, numeric) to service_role;
