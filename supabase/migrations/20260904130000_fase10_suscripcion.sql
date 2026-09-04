-- Fase 10: estado de suscripción del negocio.
--
-- La suscripción se vende y se cobra de forma personal, así que no hay pasarela
-- ni tabla de pagos: alcanza con saber hasta cuándo está vigente cada negocio.
-- Un solo plan mensual, de modo que no hace falta distinguir niveles.

alter table public.negocios
  add column suscripcion_vence_en timestamptz;

-- Los negocios que ya existen reciben el mismo trato que los nuevos: un mes
-- gratis contado desde su alta.
update public.negocios
set suscripcion_vence_en = creado_en + interval '1 month'
where suscripcion_vence_en is null;

alter table public.negocios
  alter column suscripcion_vence_en set default (now() + interval '1 month'),
  alter column suscripcion_vence_en set not null;

comment on column public.negocios.suscripcion_vence_en is
  'Fin del período pagado. Solo service_role la modifica: el administrador del negocio la ve pero no puede extenderla.';

-- No se agregan permisos a propósito, y conviene dejarlo escrito porque la
-- omisión es la que protege la columna:
--
--   * `anon` tiene un `grant select` por lista de columnas, así que esta queda
--     fuera del catálogo público y nadie puede consultar el vencimiento ajeno.
--   * `authenticated` conserva `select` sobre toda la tabla, de modo que el
--     dueño ve su propia fecha, pero su `grant update` también es por lista de
--     columnas y esta no está incluida. Sin eso, cualquier administrador podría
--     renovarse solo con una petición a la API.
