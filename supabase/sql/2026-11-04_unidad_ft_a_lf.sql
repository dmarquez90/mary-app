-- La unidad "ft — foot" se reemplaza por "LF — linear foot". Se agrega "LS" (Lump Sum / Global),
-- que no necesita cambios de esquema: la unidad se guarda como texto.
update public.presupuesto               set unidad       = 'LF' where unidad       = 'ft';
update public.materiales                set unidad       = 'LF' where unidad       = 'ft';
update public.materiales_presupuestados set unidad_libre = 'LF' where unidad_libre = 'ft';
update public.solicitud_items           set unidad       = 'LF' where unidad       = 'ft';
update public.ordenes_compra_items      set unidad       = 'LF' where unidad       = 'ft';
update public.ordenes_cambio_items      set unidad       = 'LF' where unidad       = 'ft';
update public.subcontratos_items        set unidad       = 'LF' where unidad       = 'ft';
update public.avaluos_cliente_items     set unidad       = 'LF' where unidad       = 'ft';
