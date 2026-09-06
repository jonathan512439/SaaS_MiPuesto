-- Cuánto espacio ocupa cada negocio.
--
-- El techo del plan gratuito llega antes de lo que uno cree: mil megabytes se
-- reparten entre todos los clientes, y hoy nadie se entera de que se acerca ni
-- de quién lo está gastando. Con esta pantalla, el día que haya que pasar al
-- plan pago se sabrá con semanas de anticipación y con nombre y apellido.
--
-- **Se calcula al consultar, no se lleva un contador.** Un contador mantenido
-- por disparadores sobre `storage.objects` se desincroniza al primer borrado
-- que no pase por la aplicación —una limpieza a mano, una restauración, un
-- fallo a mitad de camino— y un número de ocupación equivocado es peor que no
-- tener número: se decide con él. Sumar es barato: son unos pocos miles de
-- filas y Postgres las agrega en milisegundos.
--
-- Así queda siempre al día sin depender de que nadie recuerde actualizarlo:
-- cada foto que se sube o se borra ya cambia el resultado de la próxima
-- consulta.

create or replace function public.uso_almacenamiento()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.exigir_admin_plataforma();
  v_por_negocio jsonb;
  v_bytes bigint;
  v_archivos bigint;
  v_huerfanos bigint;
begin
  -- La primera carpeta de cada archivo es el identificador del negocio, tal
  -- como lo exigen las políticas de los dos baldes.
  with archivos as (
    select
      nullif(split_part(objeto.name, '/', 1), '') as carpeta,
      coalesce((objeto.metadata ->> 'size')::bigint, 0) as bytes
    from storage.objects as objeto
    where objeto.bucket_id in ('productos', 'negocios')
  ),
  medidos as (
    select
      carpeta::uuid as negocio_id,
      sum(bytes) as bytes,
      count(*) as archivos
    from archivos
    where carpeta ~ '^[0-9a-f-]{36}$'
    group by carpeta
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'negocio_id', negocio.id,
          'nombre', negocio.nombre,
          'slug', negocio.slug,
          'activo', negocio.activo,
          'bytes', coalesce(medidos.bytes, 0),
          'archivos', coalesce(medidos.archivos, 0)
        )
        order by coalesce(medidos.bytes, 0) desc, negocio.nombre
      ),
      '[]'::jsonb
    )
  into v_por_negocio
  from public.negocios as negocio
  left join medidos on medidos.negocio_id = negocio.id;

  select
    coalesce(sum(coalesce((objeto.metadata ->> 'size')::bigint, 0)), 0),
    count(*)
  into v_bytes, v_archivos
  from storage.objects as objeto
  where objeto.bucket_id in ('productos', 'negocios');

  -- Archivos cuya carpeta ya no corresponde a ningún negocio: sobras de una
  -- baja o de un borrado a medias. Si crecen, hay algo que limpiar.
  select count(*)
  into v_huerfanos
  from storage.objects as objeto
  where objeto.bucket_id in ('productos', 'negocios')
    and not exists (
      select 1 from public.negocios
      where negocios.id::text = split_part(objeto.name, '/', 1)
    );

  return jsonb_build_object(
    'negocios', v_por_negocio,
    'bytes_totales', v_bytes,
    'archivos_totales', v_archivos,
    'archivos_huerfanos', v_huerfanos,
    -- La base tiene su propia cuota, aparte de la de los archivos. Mostrarlas
    -- juntas evita la sorpresa de estar cómodo en una y al límite en la otra.
    'bytes_base_datos', pg_database_size(current_database()),
    'medido_en', now(),
    'actor', v_actor
  );
end;
$$;

comment on function public.uso_almacenamiento() is
  'Ocupación de los dos baldes por negocio y en total, más el tamaño de la base. Solo para administradores de la plataforma.';

revoke all on function public.uso_almacenamiento() from public, anon;
grant execute on function public.uso_almacenamiento() to authenticated;
