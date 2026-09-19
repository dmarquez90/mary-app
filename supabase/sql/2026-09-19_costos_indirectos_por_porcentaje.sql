-- ─────────────────────────────────────────────────────────────
--  MARY — Costo indirecto (C.I.) como % del costo directo
--
--  El C.I. del proyecto se define como un porcentaje del costo
--  directo ("la bolsa"). Distribuirlo en categorías/subcategorías
--  es OPCIONAL: lo no distribuido queda como disponible.
--
--  La bolsa se recalcula sola cuando cambia el costo directo;
--  las categorías ya asignadas NO se mueven. Por eso, si el
--  directo sube queda saldo a favor, y si baja puede haber
--  sobregiro que exige reajuste manual.
--
--  Baseline: al pasar el proyecto de 'planificacion' a
--  'en_ejecucion' se congela el original para poder comparar
--  original vs revisado vs real.
-- ─────────────────────────────────────────────────────────────

-- ── 1. Porcentaje del C.I. y su baseline ─────────────────────
alter table public.proyectos
  add column if not exists indirecto_pct numeric not null default 0;

alter table public.proyectos
  add column if not exists indirecto_pct_original numeric;

comment on column public.proyectos.indirecto_pct is
  'Costo indirecto como % del costo directo. 0 = se usa la suma de presupuesto_indirectos.';
comment on column public.proyectos.indirecto_pct_original is
  'Baseline del % de C.I., congelado al iniciar ejecución. NULL = aún sin congelar.';

-- ── 2. Baseline por categoría ────────────────────────────────
alter table public.presupuesto_indirectos
  add column if not exists monto_original numeric;

comment on column public.presupuesto_indirectos.monto_original is
  'Monto presupuestado original, congelado al iniciar ejecución. NULL = aún sin congelar.';

-- ── 3. Histórico dedicado a indirectos ───────────────────────
create table if not exists public.indirectos_historial (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid        not null,
  proyecto_id    uuid        not null references public.proyectos(id) on delete cascade,
  created_at     timestamptz not null default now(),

  evento         text        not null check (evento in (
                   'baseline',        -- se congeló el original
                   'pct_cambio',      -- cambió el % del C.I.
                   'asignacion',      -- alta/edición/baja de categoría
                   'reajuste_oc',     -- una orden de cambio ajustó un indirecto
                   'piso_caja_chica'  -- el piso impidió bajar Caja Chica
                 )),

  categoria      text,       -- NULL = evento a nivel de la bolsa
  subcategoria   text,

  pct_anterior    numeric,
  pct_nuevo       numeric,
  monto_anterior  numeric,
  monto_nuevo     numeric,

  costo_directo  numeric,    -- costo directo vigente al momento del evento
  bolsa          numeric,    -- C.I. total vigente al momento del evento
  asignado       numeric,    -- suma asignada a categorías en ese momento

  nota           text,
  usuario_id     uuid        references public.usuarios(id) on delete set null
);

comment on table public.indirectos_historial is
  'Bitácora de cambios del presupuesto de costos indirectos: baseline, cambios de %, asignaciones, reajustes por orden de cambio y topes de Caja Chica.';

create index if not exists idx_ind_hist_proyecto
  on public.indirectos_historial (proyecto_id, created_at desc);
create index if not exists idx_ind_hist_tenant
  on public.indirectos_historial (tenant_id, created_at desc);

-- ── RLS: mismo patrón que el resto de tablas por tenant ──────
alter table public.indirectos_historial enable row level security;

drop policy if exists "indirectos_historial_all" on public.indirectos_historial;
create policy "indirectos_historial_all"
  on public.indirectos_historial
  for all to authenticated
  using      (is_super_admin() or tenant_id = get_tenant_id())
  with check (is_super_admin() or tenant_id = get_tenant_id());
