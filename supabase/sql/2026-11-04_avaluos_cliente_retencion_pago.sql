-- Avalúos de cliente: retención (% del trabajo realizado, como la línea 5a del G702 de AIA)
-- y pago recibido del cliente (fecha y monto), para comparar lo certificado con lo cobrado.
alter table public.avaluos_cliente
  add column if not exists retencion_pct   numeric not null default 0,
  add column if not exists retencion_monto numeric not null default 0,
  add column if not exists fecha_pago      date,
  add column if not exists monto_pagado    numeric;
