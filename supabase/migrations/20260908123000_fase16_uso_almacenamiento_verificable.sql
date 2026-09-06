-- El cálculo se separa del permiso.
--
-- Tal como quedó, la única forma de comprobar que las sumas dan bien era entrar
-- al panel con la cuenta de administrador y mirar. Un número que gobierna la
-- decisión de pagar un plan merece poder verificarse desde afuera.
--
-- Ahora el conteo vive en `private`, donde solo llega la clave de servicio, y la
-- función pública sigue siendo la misma puerta con el mismo control: exige ser
-- administrador de la plataforma antes de devolver nada.

create or replace function private.calcular_uso_almacenamiento()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_por_negocio jsonb;
  v_bytes bigint;
  v_archivos bigint;
  v_huerfanos bigint;
begin
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
    'bytes_base_datos', pg_database_size(current_database()),
    'medido_en', now()
  );
end;
$$;

revoke all on function private.calcular_uso_almacenamiento() from public, anon, authenticated;
grant execute on function private.calcular_uso_almacenamiento() to service_role;

create or replace function public.uso_almacenamiento()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.exigir_admin_plataforma();
begin
  return private.calcular_uso_almacenamiento() || jsonb_build_object('actor', v_actor);
end;
$$;

revoke all on function public.uso_almacenamiento() from public, anon;
grant execute on function public.uso_almacenamiento() to authenticated;
