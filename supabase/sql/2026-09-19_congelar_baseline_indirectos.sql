-- ─────────────────────────────────────────────────────────────
--  MARY — Congelado atómico del baseline de costos indirectos
--
--  Antes esto se hacía desde el cliente: un UPDATE al proyecto y
--  después un UPDATE por cada categoría dentro de un bucle. Si el
--  proceso se cortaba a la mitad, el proyecto quedaba con
--  indirecto_pct_original ya seteado y solo algunas categorías con
--  monto_original — y como el guard del cliente es "== null", no
--  reintentaba nunca: el baseline quedaba a medias en silencio.
--
--  Esta función hace ambas cosas en una sola transacción y es
--  idempotente: los WHERE ... IS NULL hacen que volver a llamarla
--  solo complete lo que falte. SECURITY INVOKER, así que respeta
--  las mismas políticas RLS que el resto.
-- ─────────────────────────────────────────────────────────────

create or replace function public.congelar_baseline_indirectos(p_proyecto_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.proyectos
     set indirecto_pct_original = indirecto_pct
   where id = p_proyecto_id
     and indirecto_pct_original is null;

  update public.presupuesto_indirectos
     set monto_original = monto_presupuestado
   where proyecto_id = p_proyecto_id
     and monto_original is null;
end;
$$;

comment on function public.congelar_baseline_indirectos(uuid) is
  'Congela el presupuesto original de indirectos (proyecto + categorías) en una sola transacción. Idempotente: solo completa lo que esté sin congelar.';

grant execute on function public.congelar_baseline_indirectos(uuid) to authenticated;
