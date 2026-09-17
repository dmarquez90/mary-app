-- ─────────────────────────────────────────────────────────────
--  MARY — Solicitudes de capacitación (formulario de la landing)
--  Ejecutar una sola vez en el SQL Editor de Supabase.
--  Solo la Edge Function `solicitar-capacitacion` (service_role)
--  escribe en esta tabla; el super admin puede leerla y darle seguimiento.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.solicitudes_capacitacion (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  nombre          text        not null,
  empresa         text,
  email           text        not null,
  telefono        text,
  pais            text        not null,
  rol             text,
  participantes   integer,
  modalidad       text        not null default 'virtual'
                    check (modalidad in ('virtual','presencial','hibrida')),
  temas           text[]      not null default '{}',
  mensaje         text,
  lang            text        not null default 'ES' check (lang in ('ES','EN')),
  origen          text        not null default 'landing',
  user_agent      text,
  estado          text        not null default 'nueva'
                    check (estado in ('nueva','contactada','agendada','cerrada','descartada')),
  notas_internas  text,
  atendida_por    uuid references public.usuarios(id) on delete set null,
  atendida_at     timestamptz
);

comment on table public.solicitudes_capacitacion is
  'Leads del formulario de capacitación de la landing pública de MARY.';

-- Índices para el anti-spam por correo y para el listado por fecha/estado
create index if not exists idx_solicitudes_cap_email   on public.solicitudes_capacitacion (email, created_at desc);
create index if not exists idx_solicitudes_cap_created on public.solicitudes_capacitacion (created_at desc);
create index if not exists idx_solicitudes_cap_estado  on public.solicitudes_capacitacion (estado);

-- ── RLS ──────────────────────────────────────────────────────
-- Sin políticas para anon/authenticated => nadie lee ni escribe con la anon key.
-- La Edge Function usa service_role, que ignora RLS.
alter table public.solicitudes_capacitacion enable row level security;

drop policy if exists "super_admin lee solicitudes de capacitacion" on public.solicitudes_capacitacion;
create policy "super_admin lee solicitudes de capacitacion"
  on public.solicitudes_capacitacion
  for select to authenticated
  using (
    exists (
      select 1 from public.usuarios u
      where u.id = auth.uid() and u.rol = 'super_admin'
    )
  );

drop policy if exists "super_admin actualiza solicitudes de capacitacion" on public.solicitudes_capacitacion;
create policy "super_admin actualiza solicitudes de capacitacion"
  on public.solicitudes_capacitacion
  for update to authenticated
  using (
    exists (
      select 1 from public.usuarios u
      where u.id = auth.uid() and u.rol = 'super_admin'
    )
  )
  with check (
    exists (
      select 1 from public.usuarios u
      where u.id = auth.uid() and u.rol = 'super_admin'
    )
  );
