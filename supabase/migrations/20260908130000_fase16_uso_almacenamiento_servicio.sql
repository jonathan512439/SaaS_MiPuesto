-- La misma medición, para las herramientas de operación.
--
-- `private` no se publica por HTTP, así que el cálculo quedaba sin forma de
-- comprobarse desde afuera. Esta es la puerta de servicio: mismo número, sin
-- control de sesión, y solo la abre la clave privilegiada. Es el mismo trato
-- que ya tiene `estado_tareas`, que usa `/api/salud`.

create or replace function public.uso_almacenamiento_servicio()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.calcular_uso_almacenamiento();
$$;

comment on function public.uso_almacenamiento_servicio() is
  'Ocupación de almacenamiento para scripts de operación. Solo service_role.';

revoke all on function public.uso_almacenamiento_servicio() from public, anon, authenticated;
grant execute on function public.uso_almacenamiento_servicio() to service_role;
