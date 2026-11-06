-- ─────────────────────────────────────────────────────────────
--  MARY — Rol Gerente General y flujo de aprobaciones (2026-11-05)
--
--  * Nuevo rol 'gerente_general': acceso a todos los módulos y proyectos
--    (los permisos personalizados no lo restringen).
--  * SOLO el Gerente General aprueba (el admin ya no):
--      - solicitudes de materiales (pendiente → aprobada/rechazada)
--      - órdenes de compra (pendiente_aprobacion → aprobada/cancelada)
--      - órdenes de cambio  (presentada → revisada_pm → aprobada)
--      - avalúos de cliente (presentado → revisado_pm → aprobado)
--      - avalúos de subcontrato (borrador → revisado_pm → aprobado)
--  * En órdenes de cambio y avalúos el visto bueno del Project Manager
--    ('gerente') es OBLIGATORIO antes de la aprobación del GG.
--  * La regla se valida aquí (trigger), no solo en la interfaz.
--  * Correos: el GG recibe los de aprobación pendiente; el PM los de
--    visto bueno pendiente. Admin y bodega ya no reciben estos correos.
--
--  super_admin y service_role (auth.uid() nulo) no pasan por la validación.
--  Idempotente.
-- ─────────────────────────────────────────────────────────────

begin;

-- ── Rol y estados nuevos
alter table public.usuarios drop constraint if exists usuarios_rol_check;
alter table public.usuarios add constraint usuarios_rol_check check (rol = any (array[
  'super_admin','client_admin','gerente_general','coordinador','gerente','residente',
  'bodeguero','contador','lectura','supervisor']));

alter table public.ordenes_cambio drop constraint if exists ordenes_cambio_estado_check;
alter table public.ordenes_cambio add constraint ordenes_cambio_estado_check check (estado = any (array[
  'borrador','presentada','revisada_pm','aprobada','rechazada']));

-- 'rechazado' ya lo usaba la app pero faltaba en la restricción (rechazar fallaba)
alter table public.avaluos_cliente drop constraint if exists avaluos_cliente_estado_check;
alter table public.avaluos_cliente add constraint avaluos_cliente_estado_check check (estado = any (array[
  'borrador','presentado','revisado_pm','aprobado','rechazado']));

-- ── Matriz de edición por rol (espejo de MATRIX en usePermissions.js)
create or replace function public.rol_puede_editar_modulo(p_rol text, p_modulo text)
returns boolean
language sql immutable
as $$
  select case p_rol
    when 'super_admin'     then true
    when 'client_admin'    then true
    when 'gerente_general' then true
    when 'coordinador'  then p_modulo = any (array['proyectos','presupuesto','mat_pres','compras','ordenes_cambio','avaluos','supervision'])
    when 'gerente'      then p_modulo = any (array['presupuesto','compras','financiero','ordenes_cambio','avaluos','supervision'])
    when 'residente'    then p_modulo = any (array['compras','financiero','ordenes_cambio','avaluos','supervision'])
    when 'bodeguero'    then p_modulo = any (array['inventario'])
    when 'contador'     then p_modulo = any (array['financiero'])
    when 'supervisor'   then p_modulo = any (array['compras','avaluos','supervision'])
    else false
  end
$$;

-- El GG ignora permisos personalizados (acceso total)
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
  if v_rol in ('super_admin', 'gerente_general') then return true; end if;

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

-- ── Validación de aprobaciones
create or replace function public.fn_validar_aprobacion()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_rol text;
  v_old text := case when tg_op = 'UPDATE' then old.estado else null end;
  v_new text := new.estado;
  pm    boolean;
  gg    boolean;
  ok    boolean := true;
begin
  if v_old is not distinct from v_new then return new; end if;
  if auth.uid() is null then return new; end if;          -- service_role / tareas del servidor
  select rol into v_rol from public.usuarios where id = auth.uid();
  if v_rol = 'super_admin' then return new; end if;
  pm := v_rol = 'gerente';
  gg := v_rol = 'gerente_general';

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
    if    v_new = 'revisado_pm' then ok := pm and v_old = 'borrador';
    elsif v_new = 'aprobado'    then ok := gg and v_old = 'revisado_pm';
    elsif v_new = 'rechazado'   then ok := pm or gg;
    end if;

  elsif tg_table_name = 'ordenes_compra' then
    if (v_old is null or v_old = 'pendiente_aprobacion')
       and v_new in ('aprobada', 'cancelada', 'rechazada') then
      ok := gg;
    end if;

  elsif tg_table_name = 'solicitudes' then
    if v_old = 'pendiente'
       and v_new in ('pendiente_bodega', 'pendiente_oc', 'dividida', 'rechazada') then
      ok := gg;
    end if;
  end if;

  if not ok then
    raise exception 'Solo el Gerente General puede aprobar (y en órdenes de cambio/avalúos se requiere antes el visto bueno del Project Manager). / Only the General Manager can approve (change orders and valuations need the Project Manager''s sign-off first).'
      using errcode = '42501';
  end if;
  return new;
end
$$;

do $$
declare t text;
begin
  foreach t in array array['ordenes_cambio','avaluos_cliente','subcontratos_avaluos','ordenes_compra','solicitudes'] loop
    execute format('drop trigger if exists trg_validar_aprobacion on public.%I', t);
    execute format('create trigger trg_validar_aprobacion before insert or update of estado on public.%I for each row execute function public.fn_validar_aprobacion()', t);
  end loop;
end $$;

-- ── Correos según tipo de notificación y rol del destinatario
create or replace function public.fn_email_notificacion()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_rol text;
begin
  select rol into v_rol from public.usuarios where id = new.usuario_id;
  if (v_rol = 'gerente_general' and new.tipo in (
        'solicitud_nueva', 'oc_compra_nueva', 'oc_cambio_aprobar', 'avaluo_cliente_aprobar', 'avaluo_sub_aprobar'))
     or (v_rol = 'gerente' and new.tipo in (
        'oc_cambio_revisar', 'avaluo_cliente_revisar', 'avaluo_sub_revisar')) then
    perform net.http_post(
      url     := 'https://wiadlgqgjafbqwwbbevx.supabase.co/functions/v1/enviar-notificacion',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpYWRsZ3FnamFmYnF3d2JiZXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMDk1MDAsImV4cCI6MjA5MjY4NTUwMH0.tm8aN4_vSMdYADi-_KWTL6_gA5pIvZcYYhZtUGyohL8'
      ),
      body    := jsonb_build_object('id', new.id)
    );
  end if;
  return new;
exception when others then
  -- un fallo de correo nunca debe impedir que se cree la notificación
  return new;
end;
$$;

commit;

-- ── Asignación puntual (2026-11-05): Abdul Latifi (Mumtaz Builders Group LLC) → Gerente General
-- update public.usuarios set rol = 'gerente_general' where lower(email) = 'blatify@gmail.com';
