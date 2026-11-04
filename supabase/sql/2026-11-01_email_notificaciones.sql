-- Envío por correo de notificaciones: solicitud de materiales, avalúos pendientes y órdenes de cambio.
-- Cada fila nueva de `notificaciones` de esos tipos llama a la función `enviar-notificacion`.

create extension if not exists pg_net with schema extensions;

alter table public.notificaciones add column if not exists email_enviado_at timestamptz;

create or replace function public.fn_email_notificacion()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.tipo in ('solicitud_nueva', 'avaluo_cliente_nuevo', 'avaluo_sub_nuevo', 'oc_cambio_nueva') then
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

drop trigger if exists trg_email_notificacion on public.notificaciones;
create trigger trg_email_notificacion
  after insert on public.notificaciones
  for each row execute function public.fn_email_notificacion();
