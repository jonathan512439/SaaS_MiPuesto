-- Qué archivos de Storage no usa nadie, y qué referencias apuntan a un archivo
-- que no existe.
--
-- Las rutas cuidan el orden —el archivo se sube antes de vincularlo y se
-- desvincula antes de borrarlo—, así que lo peor que deja un corte es un
-- archivo sin uso. Pero eso hay que poder verlo, y una referencia rota —una
-- foto que el cliente ve como un hueco— no debería existir nunca. Lo pidió la
-- auditoría del 2026-09-30: revisar las fotos cada semana.
--
-- Solo lee. Devuelve una fila por problema:
--   - `rota`: la base apunta a un archivo que no está. Se ve en el catálogo.
--   - `sin_uso`: un archivo que nada usa. Ocupa espacio y nadie lo ve. Se
--     ignoran los de la última hora: una subida en curso sube el archivo un
--     momento antes de vincularlo.
--
-- Las referencias son las fotos de los productos —también los de la papelera,
-- que se pueden restaurar— y del negocio el logo, la portada, el QR de cobro y
-- los banners. Una dirección completa (`https://…`) no es de nuestro Storage y
-- no se mira.
--
-- La corre `scripts/revisar-archivos.mjs`: a mano con `npm run archivos:revisar`
-- y cada semana desde GitHub. Solo la clave de servicio.

create or replace function public.revisar_archivos_storage()
returns table (tipo text, bucket text, ruta text, negocio text)
language sql
stable
security definer
set search_path = ''
as $$
  with referencias as (
    select 'productos'::text as bucket, foto as ruta
    from public.productos as producto, unnest(producto.fotos) as foto
    union
    select 'negocios', imagen
    from public.negocios as negocio,
      lateral (values (negocio.logo_url), (negocio.portada_url), (negocio.qr_pago_url)) as imagenes (imagen)
    where imagen is not null
    union
    select 'negocios', banner ->> 'imagen'
    from public.negocios as negocio, jsonb_array_elements(negocio.banners) as banner
    where jsonb_typeof(banner) = 'object' and banner ->> 'imagen' is not null
  ),
  propias as (
    select referencias.bucket, referencias.ruta
    from referencias
    where referencias.ruta !~ '^https?://'
  ),
  archivos as (
    select objeto.bucket_id as bucket, objeto.name as ruta, objeto.created_at
    from storage.objects as objeto
    where objeto.bucket_id in ('productos', 'negocios')
      and objeto.name not like '%.emptyFolderPlaceholder'
  ),
  problemas as (
    select 'rota'::text as tipo, propias.bucket, propias.ruta
    from propias
    where not exists (
      select 1 from archivos
      where archivos.bucket = propias.bucket and archivos.ruta = propias.ruta
    )
    union all
    select 'sin_uso', archivos.bucket, archivos.ruta
    from archivos
    where archivos.created_at < now() - interval '1 hour'
      and not exists (
        select 1 from propias
        where propias.bucket = archivos.bucket and propias.ruta = archivos.ruta
      )
  )
  -- El negocio sale de la primera carpeta de la ruta, que es su id.
  select problemas.tipo, problemas.bucket, problemas.ruta, coalesce(negocio.slug, '(sin negocio)')
  from problemas
  left join public.negocios as negocio
    on negocio.id::text = split_part(problemas.ruta, '/', 1)
  order by problemas.tipo, negocio.slug, problemas.ruta;
$$;

revoke all on function public.revisar_archivos_storage() from public, anon, authenticated;
grant execute on function public.revisar_archivos_storage() to service_role;
