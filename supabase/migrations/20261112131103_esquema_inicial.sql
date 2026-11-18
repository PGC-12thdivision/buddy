-- BUDDY: esquema inicial (plan.md, U2; "Modelo de datos", KTD3, KTD11, KTD14, KTD16).
-- Todas las tablas con RLS. "Solo lectura" = el usuario lee sus filas y escribe el servidor con el cliente admin.
-- Toda clave foránea a auth.users lleva on delete cascade (borrar la cuenta no deja filas).

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Cuenta
-- ---------------------------------------------------------------------------

-- Estado de cuenta: el usuario no puede escribirlo (ni rol ni suscripción), KTD3.
create table public.account_status (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  subscription_status text not null default 'none'
    check (subscription_status in ('none', 'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')),
  trial_ends_at timestamptz not null,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  show_rest_timer boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Wizard (sin datos de salud)
-- ---------------------------------------------------------------------------

-- Lo escribe el servidor: en el registro y en el cambio mensual de foco o días (D43).
create table public.onboarding_answers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  focus text not null check (focus in ('equilibrado', 'fuerza', 'musculo', 'grasa')),
  experience text not null check (experience in ('nunca', 'menos_6_meses', '6_meses_2_anos', 'mas_2_anos')),
  days_per_week smallint not null check (days_per_week between 2 and 5),
  minutes_per_session smallint not null check (minutes_per_session in (30, 45, 60, 75)),
  sports text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  version text not null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);
create index consents_user_idx on public.consents (user_id);

-- ---------------------------------------------------------------------------
-- Salud (categoría especial, RGPD): solo el servidor escribe, con consentimiento vigente;
-- se borra al retirar el consentimiento.
-- ---------------------------------------------------------------------------

create table public.health_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  limitations text[] not null default '{}'
    check (limitations <@ array['hombro', 'codo', 'muneca', 'cuello_espalda_alta', 'espalda_baja', 'cadera', 'rodilla', 'tobillo']::text[]),
  screening_version text not null,
  screening_passed_at timestamptz not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catálogo cerrado (guardarraíl 2): lo escriben las migraciones.
-- ---------------------------------------------------------------------------

create table public.equipment_types (
  id text primary key,
  name text not null,
  zone text not null check (zone in ('pierna', 'espalda', 'pecho_hombro', 'brazo', 'peso_libre', 'cardio')),
  increment_kg numeric(5, 2) not null check (increment_kg >= 0),
  min_kg numeric(6, 2) not null default 0 check (min_kg >= 0)
);

create table public.exercises (
  id text primary key,
  name text not null,
  equipment_type_id text not null references public.equipment_types (id),
  pattern text not null,
  region text not null,
  muscle_groups text[] not null,
  joints text[] not null default '{}',
  calibration_load_kg numeric(6, 2) not null check (calibration_load_kg >= 0)
);
create index exercises_equipment_idx on public.exercises (equipment_type_id);

create table public.activity_types (
  id text primary key,
  name text not null
);

create table public.gym_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  preset text not null check (preset in ('completo', 'basico', 'peso_libre')),
  equipment_type_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Plan (lo escribe el servidor: IA validada o refiltrado)
-- ---------------------------------------------------------------------------

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  version integer not null,
  focus text not null check (focus in ('equilibrado', 'fuerza', 'musculo', 'grasa')),
  days_per_week smallint not null check (days_per_week between 2 and 5),
  template text not null check (template in ('cuerpo_completo', 'torso_pierna')),
  source text not null check (source in ('ia', 'refiltrado', 'checkin')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, version)
);
create unique index plans_one_active_idx on public.plans (user_id) where is_active;

create table public.plan_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  day_index smallint not null,
  label text not null,
  unique (plan_id, day_index)
);
create index plan_sessions_user_idx on public.plan_sessions (user_id);

-- Un hueco tiene exercise_id nulo y un código de motivo cerrado, nunca la articulación (sistema §11.27).
create table public.plan_slots (
  id uuid primary key default gen_random_uuid(),
  plan_session_id uuid not null references public.plan_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  position smallint not null,
  pattern text not null,
  region text not null,
  exercise_id text references public.exercises (id),
  gap_reason text check (gap_reason in ('sin_alternativa_limitacion', 'sin_alternativa_equipo')),
  sets smallint check (sets >= 2),
  rep_min smallint,
  rep_max smallint,
  check ((exercise_id is null) = (gap_reason is not null)),
  check (exercise_id is null or (sets is not null and rep_min is not null and rep_max is not null and rep_min <= rep_max)),
  unique (plan_session_id, position)
);
create index plan_slots_user_idx on public.plan_slots (user_id);

-- ---------------------------------------------------------------------------
-- Entreno (IDs generados en el cliente, D28 / KTD11)
-- ---------------------------------------------------------------------------

create table public.workout_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_session_id uuid references public.plan_sessions (id) on delete set null,
  kind text not null check (kind in ('calibracion', 'normal')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  unique (id, user_id)
);
create index workout_sessions_user_idx on public.workout_sessions (user_id, started_at);

-- La clave foránea compuesta impide colgar una serie de la sesión de otro usuario.
create table public.set_logs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null,
  exercise_id text not null references public.exercises (id),
  set_index smallint not null check (set_index >= 1),
  weight_kg numeric(6, 2) not null check (weight_kg >= 0),
  reps smallint not null check (reps >= 0),
  rir smallint check (rir between 0 and 4),
  status text not null check (status in ('hecha', 'saltada')),
  created_at timestamptz not null default now(),
  foreign key (session_id, user_id) references public.workout_sessions (id, user_id) on delete cascade
);
create index set_logs_user_exercise_idx on public.set_logs (user_id, exercise_id, created_at);

create table public.exercise_state (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id text not null references public.exercises (id),
  working_weight_kg numeric(6, 2),
  increment_kg_override numeric(5, 2) check (increment_kg_override > 0),
  calibrated_at timestamptz,
  primary key (user_id, exercise_id)
);

-- Dato de salud: lo escribe el servidor con consentimiento vigente.
create table public.discomfort_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null references public.exercises (id),
  session_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (session_id, user_id) references public.workout_sessions (id, user_id) on delete cascade
);
create index discomfort_marks_user_idx on public.discomfort_marks (user_id, exercise_id, created_at);

-- ---------------------------------------------------------------------------
-- Coach (premium 1): el ajuste lo escribe siempre el servidor.
-- ---------------------------------------------------------------------------

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  feeling smallint not null check (feeling between 1 and 5),
  fatigue smallint not null check (fatigue between 1 and 5),
  adjustment jsonb,
  applied boolean,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ---------------------------------------------------------------------------
-- Registro interno: sin contenido de salud y sin acceso para el usuario.
-- ---------------------------------------------------------------------------

create table public.ai_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('plan', 'regenerar', 'checkin', 'estancamiento', 'semana', 'expres', 'pregunta')),
  model text not null,
  outcome text not null default 'pending'
    check (outcome in ('pending', 'ok', 'validation_failed', 'connection', 'refused', 'empty')),
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(10, 6),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index ai_calls_user_idx on public.ai_calls (user_id, created_at);

-- Lista cerrada de eventos de producto: ninguno revela salud ni el resultado del cribado (KTD14).
create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (name in (
    'wizard_vista', 'wizard_completada', 'wizard_abandonada',
    'registro', 'plan_generado', 'sesion_empezada', 'sesion_terminada',
    'sustituir', 'saltar', 'checkin_hecho', 'checkout_iniciado', 'premium_activado'
  )),
  step text check (step in (
    'bienvenida', 'foco', 'experiencia', 'disponibilidad', 'deportes', 'gimnasio',
    'registro', 'consentimiento', 'limitaciones', 'seguridad', 'resumen', 'plan'
  )),
  created_at timestamptz not null default now()
);
create index events_user_idx on public.events (user_id, created_at);

create table public.stripe_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('bienvenida', 'compra', 'inactividad')),
  period text not null,
  status text not null check (status in ('sent', 'failed')),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind, period)
);

-- Contador diario anónimo (D30): sin user_id y fuera del esquema expuesto.
create table private.daily_counters (
  day date not null,
  metric text not null check (metric in ('molestia', 'cribado_bloqueado')),
  total integer not null default 0,
  primary key (day, metric)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.account_status enable row level security;
alter table public.user_settings enable row level security;
alter table public.onboarding_answers enable row level security;
alter table public.consents enable row level security;
alter table public.health_profile enable row level security;
alter table public.equipment_types enable row level security;
alter table public.exercises enable row level security;
alter table public.activity_types enable row level security;
alter table public.gym_profiles enable row level security;
alter table public.plans enable row level security;
alter table public.plan_sessions enable row level security;
alter table public.plan_slots enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.set_logs enable row level security;
alter table public.exercise_state enable row level security;
alter table public.discomfort_marks enable row level security;
alter table public.checkins enable row level security;
alter table public.ai_calls enable row level security;
alter table public.events enable row level security;
alter table public.stripe_events enable row level security;
alter table public.email_log enable row level security;

-- Nada para anónimos.
revoke all on all tables in schema public from anon;

-- Solo lectura de la propia fila.
create policy "leer la propia" on public.account_status for select to authenticated using ((select auth.uid()) = user_id);
create policy "leer la propia" on public.onboarding_answers for select to authenticated using ((select auth.uid()) = user_id);
create policy "leer la propia" on public.health_profile for select to authenticated using ((select auth.uid()) = user_id);
create policy "leer la propia" on public.plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "leer la propia" on public.plan_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy "leer la propia" on public.plan_slots for select to authenticated using ((select auth.uid()) = user_id);
create policy "leer la propia" on public.discomfort_marks for select to authenticated using ((select auth.uid()) = user_id);
create policy "leer la propia" on public.checkins for select to authenticated using ((select auth.uid()) = user_id);

-- Ajustes: leer y cambiar los propios (la fila la crea el trigger de registro).
create policy "leer la propia" on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "cambiar la propia" on public.user_settings for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Consentimientos: leer, dar (vigente) y retirar los propios.
create policy "leer los propios" on public.consents for select to authenticated using ((select auth.uid()) = user_id);
create policy "dar el propio" on public.consents for insert to authenticated
  with check ((select auth.uid()) = user_id and withdrawn_at is null);
create policy "retirar el propio" on public.consents for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Catálogo: lectura para usuarios con sesión.
create policy "leer catalogo" on public.equipment_types for select to authenticated using (true);
create policy "leer catalogo" on public.exercises for select to authenticated using (true);
create policy "leer catalogo" on public.activity_types for select to authenticated using (true);

-- Mi gimnasio: propio.
create policy "leer el propio" on public.gym_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "crear el propio" on public.gym_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "cambiar el propio" on public.gym_profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Sesiones de entreno: propias.
create policy "leer las propias" on public.workout_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy "crear las propias" on public.workout_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "cambiar las propias" on public.workout_sessions for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Series: insertar, editar peso/repeticiones/estado y borrar las propias (diseño D8).
create policy "leer las propias" on public.set_logs for select to authenticated using ((select auth.uid()) = user_id);
create policy "crear las propias" on public.set_logs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "editar las propias" on public.set_logs for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "borrar las propias" on public.set_logs for delete to authenticated using ((select auth.uid()) = user_id);
revoke update on public.set_logs from authenticated;
grant update (weight_kg, reps, status) on public.set_logs to authenticated;

-- Estado por ejercicio: propio.
create policy "leer el propio" on public.exercise_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "crear el propio" on public.exercise_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "cambiar el propio" on public.exercise_state for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ai_calls, events, stripe_events, email_log: RLS activada sin políticas (solo el servidor).

-- ---------------------------------------------------------------------------
-- Funciones (KTD16): lógica en private, envoltorio en public solo para service_role.
-- ---------------------------------------------------------------------------

-- Al registrarse: estado de cuenta con 14 días de prueba (D36) y ajustes por defecto.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.account_status (user_id, trial_ends_at)
  values (new.id, now() + interval '14 days');
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.bump_daily_counter(p_metric text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.daily_counters (day, metric, total)
  values (current_date, p_metric, 1)
  on conflict (day, metric) do update set total = private.daily_counters.total + 1;
$$;
revoke execute on function private.bump_daily_counter(text) from public, anon, authenticated;

create function public.bump_daily_counter(p_metric text)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.bump_daily_counter(p_metric);
$$;
revoke execute on function public.bump_daily_counter(text) from public, anon, authenticated;
grant execute on function public.bump_daily_counter(text) to service_role;
grant usage on schema private to service_role;
grant execute on function private.bump_daily_counter(text) to service_role;
