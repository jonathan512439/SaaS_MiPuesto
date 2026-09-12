-- Cuántos cupos hay tomados, para todos los productos de un negocio a la vez.
--
-- `cupos_tomados` responde por un producto y sirve para la ficha, donde se mira
-- uno solo. El catálogo necesita otra cosa: saber el próximo turno libre de
-- **cada** servicio para poder mostrarlo en su tarjeta, y pedirlo producto por
-- producto sería una consulta por tarjeta.
--
-- Devuelve cuentas y nada más, igual que su hermana: las citas guardan nombre y
-- teléfono, y `anon` no puede leer esa tabla. Por eso es `security definer`.

create or replace function public.cupos_tomados_negocio(
  p_negocio_id uuid,
  p_desde timestamptz,
  p_hasta timestamptz
)
returns table (producto_id uuid, inicio timestamptz, tomados bigint)
language sql
security definer
set search_path = ''
stable
as $funcion$
  select cita.producto_id, lower(cita.rango) as inicio, count(*) as tomados
  from public.citas as cita
  join public.negocios as negocio on negocio.id = cita.negocio_id
  where cita.negocio_id = p_negocio_id
    and cita.estado <> 'cancelada'
    and negocio.activo = true
    and cita.rango && tstzrange(p_desde, p_hasta)
  group by cita.producto_id, lower(cita.rango);
$funcion$;

revoke all on function public.cupos_tomados_negocio(uuid, timestamptz, timestamptz) from public;
grant execute on function public.cupos_tomados_negocio(uuid, timestamptz, timestamptz) to anon;
grant execute on function public.cupos_tomados_negocio(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.cupos_tomados_negocio(uuid, timestamptz, timestamptz) to service_role;

comment on function public.cupos_tomados_negocio(uuid, timestamptz, timestamptz) is
  'Cupos tomados por producto y franja, para todo un negocio. Cuentas, nunca datos de quien reservó.';
