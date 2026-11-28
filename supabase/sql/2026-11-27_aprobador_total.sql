-- ─────────────────────────────────────────────────────────────
--  MARY — Aprobador total para un usuario específico (2026-11-27)
--
--  * Solo el usuario Deybi Marquez (client_admin, tenant Mumtaz) puede
--    aprobar TODO: en el trigger de aprobaciones cuenta a la vez como
--    PM (visto bueno), Gerente General (aprobación final) y
--    Administrador. El orden del flujo se mantiene (visto bueno → aprobación).
--  * No cambia nada para los demás usuarios ni roles. Sin columnas nuevas.
--  * Espejo en la app: APROBADORES_TOTALES en src/usePermissions.js.
--  Idempotente.
-- ─────────────────────────────────────────────────────────────

create or replace function public.fn_validar_aprobacion()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_rol text;
  -- Usuarios con permiso de aprobar todo (espejo de APROBADORES_TOTALES en usePermissions.js)
  v_apr boolean := auth.uid() = any (array['4bbb1929-e3af-4f70-81f4-32a2125f4b0c']::uuid[]);
  v_old text := case when tg_op = 'UPDATE' then old.estado else null end;
  v_new text := new.estado;
  pm    boolean;
  gg    boolean;
  adm   boolean;
  ok    boolean := true;
begin
  if v_old is not distinct from v_new then return new; end if;
  if auth.uid() is null then return new; end if;          -- service_role / tareas del servidor
  select rol into v_rol from public.usuarios where id = auth.uid();
  if v_rol = 'super_admin' then return new; end if;
  pm  := v_rol = 'gerente'         or v_apr;
  gg  := v_rol = 'gerente_general' or v_apr;
  adm := v_rol = 'client_admin'    or v_apr;

  if tg_table_name = 'ordenes_cambio' then
    if    v_new = 'revisada_pm' then ok := pm and v_old = 'presentada';
    elsif v_new = 'aprobada'    then ok := gg and v_old = 'revisada_pm';
    elsif v_new = 'rechazada'   then ok := pm or gg;
    end if;

  elsif tg_table_name = 'avaluos_cliente' then
    if    v_new = 'revisado_pm' then ok := pm and v_old = 'presentado';
    elsif v_new = 'aprobado'    then ok := gg and v_old = 'revisado_pm';
    elsif v_new = 'rechazado'   then ok := pm or gg;
    end if;

  elsif tg_table_name = 'subcontratos_avaluos' then
    -- borrador → presentado (Submit): cualquiera con permiso de escritura (lo controla RLS)
    if    v_new = 'presentado'  then ok := v_old = 'borrador';
    elsif v_new = 'revisado_pm' then ok := false;          -- estado del flujo anterior, ya no se asigna
    elsif v_new = 'aprobado'    then ok := (pm or gg or adm) and v_old in ('presentado', 'revisado_pm');
    elsif v_new = 'rechazado'   then ok := pm or gg or adm;
    end if;

  elsif tg_table_name = 'ordenes_compra' then
    if (v_old is null or v_old = 'pendiente_aprobacion')
       and v_new in ('aprobada', 'cancelada', 'rechazada') then
      ok := gg or adm;
    end if;

  elsif tg_table_name = 'solicitudes' then
    if v_old = 'pendiente'
       and v_new in ('pendiente_bodega', 'pendiente_oc', 'dividida', 'rechazada') then
      ok := gg or adm;
    end if;
  end if;

  if not ok then
    raise exception 'No tienes permiso para este cambio de estado (órdenes de cambio y avalúos de cliente: visto bueno del PM y aprobación del Gerente General; avalúos de subcontrato: PM, GG o Administrador después de presentarlos; compras y solicitudes: GG o Administrador). / You are not allowed to make this status change.'
      using errcode = '42501';
  end if;
  return new;
end
$function$;
