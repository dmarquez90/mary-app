-- ─────────────────────────────────────────────────────────────
--  MARY — Correcciones críticas de la prueba E2E (2026-10-04)
--
--  1. Quita la "puerta anónima" de 20 políticas RLS. Tenían la forma
--     (auth.uid() IS NULL) OR ..., así que cualquiera con la anon key
--     (que va dentro del bundle público) podía leer y modificar
--     órdenes de compra, subcontratos, caja chica, permisos, auditoría
--     y los adjuntos de la bitácora de TODOS los tenants. El resto de
--     cada condición queda igual. service_role y las funciones
--     SECURITY DEFINER no dependen de esto (no pasan por RLS).
--  2. Permite el rol 'supervisor' en usuarios (la app lo ofrece pero
--     el CHECK lo rechazaba).
--  3. ordenes_compra_items.total deja de ser columna generada
--     (cantidad*precio, sin impuesto): la app guarda ahí el total con
--     impuesto y el INSERT fallaba, así que no se podían crear OCs.
--  4. fases: agrega fecha_inicio, fecha_fin y estado, que la app usa
--     al crear fases (antes fallaba por columna inexistente).
--
--  Idempotente: se puede correr más de una vez.
-- ─────────────────────────────────────────────────────────────

begin;

-- 1. Políticas sin acceso anónimo ─────────────────────────────
DROP POLICY IF EXISTS auditoria_insert_propio ON public.auditoria_log;
CREATE POLICY auditoria_insert_propio ON public.auditoria_log AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((tenant_id = ( SELECT usuarios.tenant_id
   FROM usuarios
  WHERE (usuarios.id = auth.uid())))));
DROP POLICY IF EXISTS auditoria_select_admins ON public.auditoria_log;
CREATE POLICY auditoria_select_admins ON public.auditoria_log AS PERMISSIVE FOR SELECT TO public
  USING (((( SELECT usuarios.rol
   FROM usuarios
  WHERE (usuarios.id = auth.uid())) = 'super_admin'::text) OR ((( SELECT usuarios.rol
   FROM usuarios
  WHERE (usuarios.id = auth.uid())) = 'client_admin'::text) AND (tenant_id = ( SELECT usuarios.tenant_id
   FROM usuarios
  WHERE (usuarios.id = auth.uid()))))));
DROP POLICY IF EXISTS bitacora_adjuntos_all ON public.bitacora_adjuntos;
CREATE POLICY bitacora_adjuntos_all ON public.bitacora_adjuntos AS PERMISSIVE FOR ALL TO public
  USING ((is_super_admin() OR ((tenant_id = get_tenant_id()) AND (EXISTS ( SELECT 1
   FROM bitacora_log bl
  WHERE ((bl.id = bitacora_adjuntos.bitacora_id) AND can_access_proyecto(bl.proyecto_id)))))))
  WITH CHECK ((is_super_admin() OR ((tenant_id = get_tenant_id()) AND (EXISTS ( SELECT 1
   FROM bitacora_log bl
  WHERE ((bl.id = bitacora_adjuntos.bitacora_id) AND can_access_proyecto(bl.proyecto_id)))))));
DROP POLICY IF EXISTS bitacora_log_all ON public.bitacora_log;
CREATE POLICY bitacora_log_all ON public.bitacora_log AS PERMISSIVE FOR ALL TO public
  USING ((is_super_admin() OR ((tenant_id = get_tenant_id()) AND can_access_proyecto(proyecto_id))))
  WITH CHECK ((is_super_admin() OR ((tenant_id = get_tenant_id()) AND can_access_proyecto(proyecto_id))));
DROP POLICY IF EXISTS tenant_isolation_cajas_chicas ON public.cajas_chicas;
CREATE POLICY tenant_isolation_cajas_chicas ON public.cajas_chicas AS PERMISSIVE FOR ALL TO public
  USING (((tenant_id = ( SELECT usuarios.tenant_id
   FROM usuarios
  WHERE (usuarios.id = auth.uid())))));
DROP POLICY IF EXISTS tenant_isolation_equipos_ajustes ON public.equipos_ajustes;
CREATE POLICY tenant_isolation_equipos_ajustes ON public.equipos_ajustes AS PERMISSIVE FOR ALL TO public
  USING (((tenant_id = get_tenant_id())));
DROP POLICY IF EXISTS tenant_isolation_gastos_caja_chica ON public.gastos_caja_chica;
CREATE POLICY tenant_isolation_gastos_caja_chica ON public.gastos_caja_chica AS PERMISSIVE FOR ALL TO public
  USING (((tenant_id = ( SELECT usuarios.tenant_id
   FROM usuarios
  WHERE (usuarios.id = auth.uid())))));
DROP POLICY IF EXISTS tenant_isolation_liquidaciones_caja_chica ON public.liquidaciones_caja_chica;
CREATE POLICY tenant_isolation_liquidaciones_caja_chica ON public.liquidaciones_caja_chica AS PERMISSIVE FOR ALL TO public
  USING (((tenant_id = ( SELECT usuarios.tenant_id
   FROM usuarios
  WHERE (usuarios.id = auth.uid())))));
DROP POLICY IF EXISTS ordenes_compra_all ON public.ordenes_compra;
CREATE POLICY ordenes_compra_all ON public.ordenes_compra AS PERMISSIVE FOR ALL TO public
  USING ((is_super_admin() OR (tenant_id = get_tenant_id())))
  WITH CHECK ((is_super_admin() OR (tenant_id = get_tenant_id())));
DROP POLICY IF EXISTS ordenes_compra_items_all ON public.ordenes_compra_items;
CREATE POLICY ordenes_compra_items_all ON public.ordenes_compra_items AS PERMISSIVE FOR ALL TO public
  USING ((is_super_admin() OR (tenant_id = get_tenant_id())))
  WITH CHECK ((is_super_admin() OR (tenant_id = get_tenant_id())));
DROP POLICY IF EXISTS opr_all ON public.ordenes_pago_retencion;
CREATE POLICY opr_all ON public.ordenes_pago_retencion AS PERMISSIVE FOR ALL TO public
  USING ((is_super_admin() OR (tenant_id = get_tenant_id())));
DROP POLICY IF EXISTS tenant_isolation_reembolsos_personal ON public.reembolsos_personal;
CREATE POLICY tenant_isolation_reembolsos_personal ON public.reembolsos_personal AS PERMISSIVE FOR ALL TO public
  USING (((tenant_id = ( SELECT usuarios.tenant_id
   FROM usuarios
  WHERE (usuarios.id = auth.uid())))));
DROP POLICY IF EXISTS solicitud_items_all ON public.solicitud_items;
CREATE POLICY solicitud_items_all ON public.solicitud_items AS PERMISSIVE FOR ALL TO public
  USING ((is_super_admin() OR (tenant_id = get_tenant_id())))
  WITH CHECK ((is_super_admin() OR (tenant_id = get_tenant_id())));
DROP POLICY IF EXISTS sc_avaluo_items_all ON public.subcontratos_avaluo_items;
CREATE POLICY sc_avaluo_items_all ON public.subcontratos_avaluo_items AS PERMISSIVE FOR ALL TO public
  USING ((is_super_admin() OR (tenant_id = get_tenant_id())))
  WITH CHECK ((is_super_admin() OR (tenant_id = get_tenant_id())));
DROP POLICY IF EXISTS sc_avaluos_all ON public.subcontratos_avaluos;
CREATE POLICY sc_avaluos_all ON public.subcontratos_avaluos AS PERMISSIVE FOR ALL TO public
  USING ((is_super_admin() OR (tenant_id = get_tenant_id())))
  WITH CHECK ((is_super_admin() OR (tenant_id = get_tenant_id())));
DROP POLICY IF EXISTS sc_contratos_all ON public.subcontratos_contratos;
CREATE POLICY sc_contratos_all ON public.subcontratos_contratos AS PERMISSIVE FOR ALL TO public
  USING ((is_super_admin() OR (tenant_id = get_tenant_id())))
  WITH CHECK ((is_super_admin() OR (tenant_id = get_tenant_id())));
DROP POLICY IF EXISTS sc_items_all ON public.subcontratos_items;
CREATE POLICY sc_items_all ON public.subcontratos_items AS PERMISSIVE FOR ALL TO public
  USING ((is_super_admin() OR (tenant_id = get_tenant_id())))
  WITH CHECK ((is_super_admin() OR (tenant_id = get_tenant_id())));
DROP POLICY IF EXISTS subcontratos_retenciones_all ON public.subcontratos_retenciones;
CREATE POLICY subcontratos_retenciones_all ON public.subcontratos_retenciones AS PERMISSIVE FOR ALL TO public
  USING ((is_super_admin() OR (tenant_id = get_tenant_id())));
DROP POLICY IF EXISTS usuario_permisos_all ON public.usuario_permisos;
CREATE POLICY usuario_permisos_all ON public.usuario_permisos AS PERMISSIVE FOR ALL TO public
  USING ((is_super_admin() OR (tenant_id = get_tenant_id())))
  WITH CHECK ((is_super_admin() OR (tenant_id = get_tenant_id())));
DROP POLICY IF EXISTS bitacora_adjuntos_storage_all ON storage.objects;
CREATE POLICY bitacora_adjuntos_storage_all ON storage.objects AS PERMISSIVE FOR ALL TO public
  USING (((bucket_id = 'bitacora-adjuntos'::text) AND (is_super_admin() OR ((storage.foldername(name))[1] = (get_tenant_id())::text))))
  WITH CHECK (((bucket_id = 'bitacora-adjuntos'::text) AND (is_super_admin() OR ((storage.foldername(name))[1] = (get_tenant_id())::text))));

-- 2. Rol supervisor ───────────────────────────────────────────
alter table public.usuarios drop constraint if exists usuarios_rol_check;
alter table public.usuarios add constraint usuarios_rol_check check (rol = any (array[
  'super_admin','client_admin','coordinador','gerente','residente',
  'bodeguero','contador','lectura','supervisor']));

-- 3. Total de artículos de OC como columna normal ─────────────
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'ordenes_compra_items'
               and column_name = 'total' and is_generated = 'ALWAYS') then
    alter table public.ordenes_compra_items drop column total;
    alter table public.ordenes_compra_items add column total numeric default 0;
    update public.ordenes_compra_items
       set total = coalesce(subtotal, cantidad * precio_unitario, 0) + coalesce(impuesto_monto, 0);
  end if;
end $$;

-- 4. Columnas de fases ────────────────────────────────────────
alter table public.fases add column if not exists fecha_inicio date;
alter table public.fases add column if not exists fecha_fin    date;
alter table public.fases add column if not exists estado       text not null default 'pendiente';
alter table public.fases drop constraint if exists fases_estado_check;
alter table public.fases add constraint fases_estado_check
  check (estado in ('pendiente','activa','completada'));

commit;
