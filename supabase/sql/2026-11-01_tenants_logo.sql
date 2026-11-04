-- Logo de la empresa (data URL PNG, redimensionado en el cliente a max 400x200)
alter table tenants add column if not exists logo_url text;
