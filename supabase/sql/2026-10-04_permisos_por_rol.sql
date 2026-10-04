-- ─────────────────────────────────────────────────────────────
--  MARY — Permisos por rol también en la base de datos (2026-10-04)
--
--  Hasta ahora la matriz de permisos (usePermissions.js) solo se
--  aplicaba en la interfaz; RLS solo separaba por tenant. Cualquier
--  usuario (incluso "lectura") podía crear/editar/borrar cualquier dato
--  de su empresa llamando a la API directamente.
--
--  Diseño:
--   * puede_escribir(modulos[]): true si el usuario puede EDITAR alguno
--     de esos módulos. Replica la matriz por defecto de cada rol y
--     respeta los permisos personalizados de usuario_permisos.permisos
--     ({modulo: {ver, editar}}), igual que la app.
--   * Por cada tabla se agregan políticas RESTRICTIVE solo para
--     INSERT / UPDATE / DELETE. Se combinan (AND) con las políticas de
--     tenant que ya existen; las lecturas (SELECT) no cambian.
--   * Cada tabla lista todos los módulos cuyos flujos la escriben
--     (p. ej. bodega actualiza el estado de una OC al recibir; aprobar
--     una orden de cambio modifica el presupuesto).
--   * usuario_permisos: solo el administrador del tenant puede escribir
--     (antes cualquier usuario podía darse permisos a sí mismo).
--   * procesar_solicitud_item (SECURITY DEFINER) ahora valida tenant.
--
--  Si cambia MATRIX en usePermissions.js, actualizar
--  rol_puede_editar_modulo() aquí.
--
--  Las funciones SECURITY DEFINER y service_role no pasan por RLS.
--  Idempotente.
-- ─────────────────────────────────────────────────────────────

begin;

-- ── Matriz de edición por defecto (espejo de MATRIX en usePermissions.js)
create or replace function public.rol_puede_editar_modulo(p_rol text, p_modulo text)
returns boolean
language sql immutable
as $$
  select case p_rol
    when 'super_admin'  then true
    when 'client_admin' then true
    when 'coordinador'  then p_modulo = any (array['proyectos','presupuesto','mat_pres','compras','ordenes_cambio','avaluos','supervision'])
    -- gerente: aprueba avalúos de cliente (AvaluosCliente.jsx puedeAprobar)
    when 'gerente'      then p_modulo = any (array['presupuesto','compras','financiero','ordenes_cambio','avaluos','supervision'])
    when 'residente'    then p_modulo = any (array['compras','financiero','ordenes_cambio','avaluos','supervision'])
    when 'bodeguero'    then p_modulo = any (array['inventario'])
    when 'contador'     then p_modulo = any (array['financiero'])
    -- supervisor: aprueba OCs (compras) y avalúos de cliente
    when 'supervisor'   then p_modulo = any (array['compras','avaluos','supervision'])
    else false  -- lectura y roles desconocidos
  end
$$;

-- ── ¿El usuario actual puede editar alguno de estos módulos?
create or replace function public.puede_escribir(p_modulos text[])
returns boolean
language plpgsql stable security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_rol      text;
  v_permisos jsonb;
  m          text;
begin
  select u.rol into v_rol from public.usuarios u where u.id = auth.uid();
  if v_rol is null then return false; end if;
  if v_rol = 'super_admin' then return true; end if;

  select up.permisos into v_permisos
    from public.usuario_permisos up where up.usuario_id = auth.uid() limit 1;

  foreach m in array p_modulos loop
    if v_permisos is not null and v_permisos ? m then
      if coalesce((v_permisos -> m ->> 'editar')::boolean, false) then return true; end if;
    elsif public.rol_puede_editar_modulo(v_rol, m) then
      return true;
    end if;
  end loop;
  return false;
end
$$;

-- ── Políticas restrictivas de escritura por tabla
do $$
declare
  r   record;
  arr text;
begin
  for r in select * from (values
    ('proyectos',                 array['proyectos']),
    ('fases',                     array['proyectos']),
    ('presupuesto',               array['presupuesto','ordenes_cambio']),
    ('presupuesto_indirectos',    array['presupuesto','ordenes_cambio']),
    ('indirectos_historial',      array['presupuesto','ordenes_cambio','financiero']),
    ('materiales',                array['inventario','financiero']),
    ('entradas',                  array['inventario','financiero']),
    ('salidas',                   array['inventario','financiero']),
    ('materiales_presupuestados', array['mat_pres','inventario','presupuesto']),
    ('solicitudes',               array['compras','inventario']),
    ('solicitud_items',           array['compras','inventario']),
    ('ordenes_compra',            array['compras','inventario']),
    ('ordenes_compra_items',      array['compras','inventario']),
    ('equipos',                   array['financiero','compras','inventario']),
    ('equipos_ajustes',           array['financiero']),
    ('costos_directos',           array['financiero']),
    ('costos_indirectos',         array['financiero']),
    ('nominas',                   array['financiero']),
    ('subcontratos',              array['financiero']),
    ('subcontratos_contratos',    array['financiero']),
    ('subcontratos_items',        array['financiero']),
    ('subcontratos_avaluos',      array['financiero']),
    ('subcontratos_avaluo_items', array['financiero']),
    ('subcontratos_retenciones',  array['financiero']),
    ('ordenes_pago_retencion',    array['financiero']),
    ('cajas_chicas',              array['financiero']),
    ('gastos_caja_chica',         array['financiero']),
    ('liquidaciones_caja_chica',  array['financiero']),
    ('reembolsos_personal',       array['financiero']),
    ('ordenes_cambio',            array['ordenes_cambio']),
    ('ordenes_cambio_items',      array['ordenes_cambio']),
    ('ordenes_cambio_indirectos', array['ordenes_cambio']),
    ('avaluos_cliente',           array['avaluos']),
    ('avaluos_cliente_items',     array['avaluos']),
    ('bitacora_log',              array['supervision']),
    ('bitacora_adjuntos',         array['supervision']),
    ('solicitudes_eliminacion',   array['inventario','financiero','compras'])
  ) as t(tabla, modulos)
  loop
    arr := quote_literal(r.modulos::text) || '::text[]';
    execute format('drop policy if exists rol_escritura_ins on public.%I', r.tabla);
    execute format('drop policy if exists rol_escritura_upd on public.%I', r.tabla);
    execute format('drop policy if exists rol_escritura_del on public.%I', r.tabla);
    execute format('create policy rol_escritura_ins on public.%I as restrictive for insert to authenticated with check (public.puede_escribir(%s))', r.tabla, arr);
    execute format('create policy rol_escritura_upd on public.%I as restrictive for update to authenticated using (public.puede_escribir(%s)) with check (public.puede_escribir(%s))', r.tabla, arr, arr);
    execute format('create policy rol_escritura_del on public.%I as restrictive for delete to authenticated using (public.puede_escribir(%s))', r.tabla, arr);
  end loop;
end $$;

-- ── usuario_permisos: lectura en el tenant, escritura solo administradores
drop policy if exists usuario_permisos_all    on public.usuario_permisos;
drop policy if exists usuario_permisos_select on public.usuario_permisos;
drop policy if exists usuario_permisos_write  on public.usuario_permisos;
create policy usuario_permisos_select on public.usuario_permisos for select
  using (public.is_super_admin() or tenant_id = public.get_tenant_id());
create policy usuario_permisos_write on public.usuario_permisos for all
  using (public.can_manage_usuarios(tenant_id))
  with check (public.can_manage_usuarios(tenant_id));

-- ── procesar_solicitud_item: validar tenant
CREATE OR REPLACE FUNCTION public.procesar_solicitud_item(p_solicitud_item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_item          public.solicitud_items%ROWTYPE;
  v_stock_actual  numeric;
  v_resultado     jsonb;
BEGIN

  SELECT * INTO v_item
  FROM public.solicitud_items
  WHERE id = p_solicitud_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Item no encontrado');
  END IF;

  -- Solo items del propio tenant (la función es SECURITY DEFINER y salta RLS)
  IF NOT public.is_super_admin() AND v_item.tenant_id IS DISTINCT FROM public.get_tenant_id() THEN
    RETURN jsonb_build_object('error', 'Item no encontrado');
  END IF;

  SELECT COALESCE(stock_actual, 0) INTO v_stock_actual
  FROM public.materiales
  WHERE id = v_item.material_id;

  -- FLUJO A: Stock Total
  IF v_stock_actual >= v_item.cantidad THEN

    UPDATE public.solicitud_items SET
      flujo_item      = 'stock_total',
      cantidad_bodega = v_item.cantidad,
      cantidad_oc     = 0,
      estado_bodega   = 'pendiente',
      estado_oc       = 'no_aplica'
    WHERE id = p_solicitud_item_id;

    v_resultado := jsonb_build_object(
      'flujo',           'stock_total',
      'cantidad_bodega', v_item.cantidad,
      'cantidad_oc',     0,
      'mensaje',         'Material disponible en bodega. Bodeguero procesará el despacho.'
    );

  -- FLUJO B: Sin Stock
  ELSIF v_stock_actual = 0 THEN

    UPDATE public.solicitud_items SET
      flujo_item      = 'sin_stock',
      cantidad_bodega = 0,
      cantidad_oc     = v_item.cantidad,
      estado_bodega   = 'no_aplica',
      estado_oc       = 'pendiente_aprobacion'
    WHERE id = p_solicitud_item_id;

    v_resultado := jsonb_build_object(
      'flujo',           'sin_stock',
      'cantidad_bodega', 0,
      'cantidad_oc',     v_item.cantidad,
      'mensaje',         'Sin stock en bodega. Se generará Orden de Compra para aprobación del CEO.'
    );

  -- FLUJO C: Stock Parcial
  ELSE

    UPDATE public.solicitud_items SET
      flujo_item      = 'stock_parcial',
      cantidad_bodega = v_stock_actual,
      cantidad_oc     = v_item.cantidad - v_stock_actual,
      estado_bodega   = 'pendiente',
      estado_oc       = 'pendiente_aprobacion'
    WHERE id = p_solicitud_item_id;

    v_resultado := jsonb_build_object(
      'flujo',           'stock_parcial',
      'cantidad_bodega', v_stock_actual,
      'cantidad_oc',     v_item.cantidad - v_stock_actual,
      'mensaje',         format(
        'Solicitud dividida: %s unidades de bodega (despacho inmediato) + %s unidades por OC (pendiente CEO).',
        v_stock_actual,
        v_item.cantidad - v_stock_actual
      )
    );

  END IF;

  RETURN v_resultado;

END;
$function$;

commit;
