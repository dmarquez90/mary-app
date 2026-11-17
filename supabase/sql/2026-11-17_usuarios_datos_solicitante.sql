-- Datos del solicitante guardados en el perfil del usuario.
-- Se precargan en Compras > Nueva solicitud (y "Elaboró" en Nueva OC).
-- Los edita cada usuario en Configuración > Mi cuenta.
alter table public.usuarios add column if not exists cargo           text;
alter table public.usuarios add column if not exists departamento    text;
alter table public.usuarios add column if not exists email_solicitud text;
