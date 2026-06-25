-- =====================================================================
-- EL GUARDIÁN SECRETO — Script SQL completo para Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- =====================================================================

-- Extensión necesaria para generar UUID
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- TABLA: activities
-- Una fila por actividad (pregunta + 4 opciones + estado del juego)
-- ---------------------------------------------------------------------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('a','b','c','d')),
  status text not null default 'draft' check (status in ('draft','active','closed')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- TABLA: participants
-- Integrantes de cada tribu, cargados por el Sabio para una actividad
-- ---------------------------------------------------------------------
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  tribe text not null check (tribe in ('mapuche','guarani','mocovi')),
  name text not null,
  responded boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_participants_activity on public.participants (activity_id);
create index if not exists idx_participants_tribe on public.participants (activity_id, tribe);

-- ---------------------------------------------------------------------
-- TABLA: responses
-- Una fila por respuesta registrada (auditoría completa)
-- ---------------------------------------------------------------------
create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  tribe text not null check (tribe in ('mapuche','guarani','mocovi')),
  option_chosen text not null check (option_chosen in ('a','b','c','d')),
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  unique (participant_id) -- garantiza una sola respuesta por participante
);

create index if not exists idx_responses_activity on public.responses (activity_id);

-- =====================================================================
-- SEGURIDAD (RLS)
-- =====================================================================
alter table public.activities enable row level security;
alter table public.participants enable row level security;
alter table public.responses enable row level security;

-- ACTIVITIES ------------------------------------------------------------
-- Lectura pública (las tribus necesitan ver la pregunta activa)
create policy "activities_select_public"
  on public.activities for select
  using (true);

-- Solo el Sabio (usuario autenticado) puede crear/editar/borrar actividades
create policy "activities_write_admin"
  on public.activities for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- PARTICIPANTS ------------------------------------------------------------
-- Lectura pública limitada (para poblar el desplegable de cada tribu)
create policy "participants_select_public"
  on public.participants for select
  using (true);

-- Solo el Sabio puede agregar/editar/borrar participantes
create policy "participants_write_admin"
  on public.participants for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- RESPONSES ------------------------------------------------------------
-- Nadie puede leer ni escribir respuestas directamente desde el cliente:
-- todo pasa por la función segura submit_response() (ver abajo),
-- y solo el Sabio puede leerlas para armar el tablero de resultados.
create policy "responses_select_admin"
  on public.responses for select
  using (auth.role() = 'authenticated');

-- (No se crea policy de insert/update para anon ni authenticated:
--  la escritura ocurre exclusivamente dentro de la función security definer)

-- =====================================================================
-- FUNCIÓN SEGURA: submit_response
-- Registra la respuesta de un participante de forma atómica:
--   - valida que la actividad esté activa
--   - valida que el participante no haya respondido antes
--   - inserta en responses y marca participants.responded = true
-- Se ejecuta con privilegios elevados (security definer) pero el
-- "anon" solo puede llamarla a través de esta función controlada,
-- nunca escribir directamente en las tablas.
-- =====================================================================
create or replace function public.submit_response(
  p_participant_id uuid,
  p_option text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant record;
  v_activity record;
  v_is_correct boolean;
begin
  select * into v_participant from public.participants where id = p_participant_id for update;

  if v_participant is null then
    return 'not_found';
  end if;

  if v_participant.responded then
    return 'already_answered';
  end if;

  select * into v_activity from public.activities where id = v_participant.activity_id;

  if v_activity is null or v_activity.status <> 'active' then
    return 'activity_closed';
  end if;

  if p_option not in ('a','b','c','d') then
    return 'invalid_option';
  end if;

  v_is_correct := (p_option = v_activity.correct_option);

  insert into public.responses (activity_id, participant_id, tribe, option_chosen, is_correct)
  values (v_activity.id, v_participant.id, v_participant.tribe, p_option, v_is_correct);

  update public.participants set responded = true where id = v_participant.id;

  return 'ok';
end;
$$;

-- Permitir que cualquier visitante (anon) y el Sabio (authenticated)
-- puedan ejecutar la función, pero NUNCA escribir las tablas directamente.
grant execute on function public.submit_response(uuid, text) to anon, authenticated;

-- =====================================================================
-- FIN DEL SCRIPT
-- Después de ejecutarlo, creá el usuario "Sabio" en:
-- Supabase Dashboard > Authentication > Users > Add user
-- (usá el mismo email que pongas en VITE_ADMIN_EMAIL del archivo .env)
-- =====================================================================
