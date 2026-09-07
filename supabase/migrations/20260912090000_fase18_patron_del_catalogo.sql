-- El dueño decide si el catálogo lleva el fondo con dibujos de su rubro.
--
-- Nace en `true` porque el patrón ya está publicado y en uso: arrancar en
-- `false` apagaría el fondo de todos los catálogos existentes al aplicar la
-- migración, que es un cambio visible que nadie pidió.
--
-- Es una preferencia visual, no un permiso: se sirve al catálogo público igual
-- que la plantilla y la paleta, porque el fondo se decide al dibujar la página.

alter table public.negocios
  add column if not exists patron_fondo boolean not null default true;

comment on column public.negocios.patron_fondo is
  'Si el catálogo público dibuja el fondo con los objetos del rubro. El panel de administración lo lleva siempre.';

grant select (patron_fondo) on table public.negocios to anon;
grant select (patron_fondo) on table public.negocios to authenticated;
grant update (patron_fondo) on table public.negocios to authenticated;

-- El service_role queda explícito. Se olvidó dos veces antes, en
-- `plataforma_admins` y en `limites_analitica_ip`, y las dos veces se descubrió
-- con la función ya rota en producción.
grant select (patron_fondo), update (patron_fondo)
  on table public.negocios to service_role;
