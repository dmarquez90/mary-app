-- ─────────────────────────────────────────────────────────────
--  MARY — País con clave canónica (2026-10-04)
--
--  El registro guardaba el país en el idioma de la pantalla
--  ('Estados Unidos', 'Mexico', 'Panama'...), distinto de las claves de
--  PAIS_MONEDA en utils.js ('United States', 'México', 'Panamá'...).
--  El formulario ya guarda la clave canónica; esto corrige lo existente.
--  Sin operaciones destructivas. Idempotente.
-- ─────────────────────────────────────────────────────────────

update public.tenants t set pais = m.canon
from (values
  ('Estados Unidos', 'United States'), ('Mexico', 'México'), ('Panama', 'Panamá'),
  ('Peru', 'Perú'), ('Spain', 'España'), ('Other', 'Otro')
) as m(viejo, canon)
where t.pais = m.viejo;

update public.proyectos p set pais = m.canon
from (values
  ('Estados Unidos', 'United States'), ('Mexico', 'México'), ('Panama', 'Panamá'),
  ('Peru', 'Perú'), ('Spain', 'España'), ('Other', 'Otro')
) as m(viejo, canon)
where p.pais = m.viejo;
