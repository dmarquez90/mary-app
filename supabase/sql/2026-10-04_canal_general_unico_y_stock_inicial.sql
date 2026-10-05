-- ─────────────────────────────────────────────────────────────
--  MARY — Canal General único y tipo del stock inicial (2026-10-04)
--
--  * Dos cargas simultáneas del Chat podían crear dos canales "General"
--    para el mismo tenant. Índice único parcial: uno por tenant.
--    (Chat.jsx reintenta la lectura si el INSERT choca con el índice.)
--  * Las entradas de stock inicial del catálogo se guardaban como
--    "Compra proyecto" sin proyecto; son reserva general.
--  Sin operaciones destructivas. Idempotente.
-- ─────────────────────────────────────────────────────────────

create unique index if not exists chat_canales_general_unico
  on public.chat_canales (tenant_id) where tipo = 'general';

update public.entradas
   set tipo_entrada = 'compra_general'
 where numero_factura = 'STOCK-INICIAL' and proyecto_id is null
   and coalesce(tipo_entrada, '') <> 'compra_general';
