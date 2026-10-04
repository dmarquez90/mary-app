-- ─────────────────────────────────────────────────────────────
--  MARY — Hora de registro en movimientos de inventario (2026-10-04)
--
--  entradas/salidas solo tenían fechas (date). Con dos entradas del mismo
--  material el mismo día, el costeo FIFO no sabía cuál llegó primero.
--  registrado_en guarda el instante exacto y se usa para desempatar
--  (costosSalidasFIFO en utils.js y valor de inventario del Dashboard).
--  Las filas existentes quedan con la hora de esta migración (empate
--  igual que antes); las nuevas ya quedan ordenadas.
--
--  Además: hasta hoy store.jsx descartaba la fecha escrita en costos
--  directos e indirectos (quedaba NULL). Se completa con created_at.
--
--  Sin operaciones destructivas. Idempotente.
-- ─────────────────────────────────────────────────────────────

begin;

alter table public.entradas add column if not exists registrado_en timestamptz not null default now();
alter table public.salidas  add column if not exists registrado_en timestamptz not null default now();

update public.costos_directos   set fecha = created_at where fecha is null;
update public.costos_indirectos set fecha = created_at where fecha is null;

commit;
