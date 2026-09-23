-- Una sola regla para llevar una palabra a su raíz, y que funcione con los dos
-- plurales del castellano.
--
-- La regla era «sacar -es o -s». Sirve para «flores» → «flor», pero no para las
-- palabras que terminan en vocal: «juguetes» quedaba en «juguet» y «juguete» en
-- «juguete», así que un sinónimo cargado en plural no se activaba con el
-- singular. Probándolo apareció.
--
-- La regla nueva saca la -s final y después la -e final:
--
--   juguetes → juguete → juguet      juguete → juguet
--   flores   → flore   → flor        flor    → flor
--   pantalones → pantalone → pantalon
--   casas    → casa                  casa    → casa
--
-- Solo en palabras de más de cuatro letras: «mes», «pan», «cafe» quedan como
-- están. Vive en una función para que la búsqueda y los sinónimos usen la misma;
-- `lib/directorio.ts` tiene la misma regla para los rubros, y una prueba las
-- compara.

create or replace function public.raiz_de_palabra(p_palabra text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when char_length(p_palabra) > 4
      then regexp_replace(regexp_replace(p_palabra, 's$', ''), 'e$', '')
    else p_palabra
  end;
$$;

grant execute on function public.raiz_de_palabra(text) to anon, authenticated, service_role;

create or replace function public.buscar_en_directorio(
  p_palabras text[] default '{}',
  p_rubros_que_coinciden text[] default '{}',
  p_ciudad text default null,
  p_zona_id uuid default null,
  p_rubro text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_pagina integer default 1
)
returns table (
  id uuid,
  slug text,
  nombre text,
  descripcion text,
  logo_url text,
  portada_url text,
  horario jsonb,
  ciudad text,
  zona text,
  rubro_publico text,
  puntaje integer,
  coincidencias integer,
  productos jsonb,
  distancia_km numeric,
  palabra text,
  total bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with palabras as (
    select distinct w
    from unnest(coalesce(p_palabras, '{}')) as w
    where char_length(w) between 2 and 40
    limit 6
  ),
  /* Los sinónimos coinciden **por la raíz**, igual que la búsqueda: el
     sinónimo cargado como «juguetes» se activa también con «juguete», y el de
     «polera» con «poleras». Antes pedían la palabra exacta, y una letra de más
     los dejaba mudos. */
  expandidas as (
    select w from palabras
    union
    select unnest(s.equivalentes)
    from public.sinonimos_busqueda s
    join palabras p
      on public.raiz_de_palabra(s.termino) = public.raiz_de_palabra(p.w)
  ),
  raices as (
    select distinct
      w as original,
      public.raiz_de_palabra(w) as r
    from expandidas
    where char_length(w) >= 3
  ),
  hay_texto as (
    select exists (select 1 from raices) as si
  ),
  candidatos as (
    select n.*
    from public.negocios n
    where n.activo
      and n.aparece_en_directorio is true
      and (p_ciudad is null or n.ciudad = p_ciudad)
      and (p_zona_id is null or n.zona_id = p_zona_id)
      and (
        p_rubro is null
        or n.rubro_publico = p_rubro
        or p_rubro = any (n.rubros_secundarios)
      )
  ),
  por_negocio as (
    select
      c.id,
      -- El nombre, el renglón y la descripción del negocio, o su rubro.
      (
        exists (
          select 1 from raices
          where lower(translate(
            coalesce(c.nombre, '') || ' ' || coalesce(c.subnombre, '') || ' ' || coalesce(c.descripcion, ''),
            'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'
          )) like '%' || raices.r || '%'
        )
        or c.rubro_publico = any (coalesce(p_rubros_que_coinciden, '{}'))
        or c.rubros_secundarios && coalesce(p_rubros_que_coinciden, '{}')
      ) as coincide_negocio,
      exists (
        select 1
        from public.categorias cat, raices
        where cat.negocio_id = c.id
          and cat.visible
          and lower(translate(cat.nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) like '%' || raices.r || '%'
      ) as coincide_categoria
    from candidatos c
  ),
  productos_que_coinciden as (
    select
      p.negocio_id,
      p.nombre,
      p.codigo,
      p.fotos[1] as foto,
      p.orden,
      /* La palabra con la que el catálogo lo va a encontrar: la escrita, si
         está tal cual en el producto; si no, la raíz. Nula si solo coincidió
         por parecido —un error de tipeo—, porque el filtro del catálogo compara
         por texto y con esa palabra no encontraría nada. */
      (
        select case
          when p.texto_busqueda like '%' || rx.original || '%' then rx.original
          else rx.r
        end
        from raices rx
        where p.texto_busqueda like '%' || rx.r || '%'
        order by char_length(rx.original) desc
        limit 1
      ) as palabra
    from public.productos p
    join candidatos c on c.id = p.negocio_id
    where p.visible
      and p.eliminado_en is null
      and exists (
        select 1 from raices
        where p.texto_busqueda like '%' || raices.r || '%'
           -- Con esquema: la función corre con `search_path` vacío y
           -- `pg_trgm` vive en `public`. Sin el prefijo el operador no existe.
           or raices.r operator(public.<%) p.texto_busqueda
      )
  ),
  resumen_productos as (
    select
      negocio_id,
      count(*)::integer as cantidad,
      mode() within group (order by palabra) filter (where palabra is not null) as palabra,
      (
        select jsonb_agg(jsonb_build_object('nombre', x.nombre, 'codigo', x.codigo, 'foto', x.foto))
        from (
          select pq2.nombre, pq2.codigo, pq2.foto
          from productos_que_coinciden pq2
          where pq2.negocio_id = pq.negocio_id
          -- Primero los que tienen foto: son los que se muestran.
          order by (pq2.foto is null), pq2.orden
          limit 3
        ) x
      ) as muestra
    from productos_que_coinciden pq
    group by negocio_id
  ),
  puntuados as (
    select
      c.*,
      case
        when not (select si from hay_texto) then 0
        when pn.coincide_negocio then 3
        when pn.coincide_categoria then 2
        when rp.cantidad > 0 then 1
        else 0
      end as puntaje_calc,
      coalesce(rp.cantidad, 0) as cantidad_productos,
      rp.muestra,
      rp.palabra,
      case
        when p_lat is null or p_lng is null or c.ubicacion_lat is null then null
        -- Redondeada a medio kilómetro: dice «a 1,5 km», no dónde está.
        else round(
          2 * 6371 * asin(sqrt(
            power(sin(radians((c.ubicacion_lat - p_lat) / 2)), 2)
            + cos(radians(p_lat)) * cos(radians(c.ubicacion_lat))
              * power(sin(radians((c.ubicacion_lng - p_lng) / 2)), 2)
          )) * 2
        ) / 2
      end as distancia
    from candidatos c
    join por_negocio pn on pn.id = c.id
    left join resumen_productos rp on rp.negocio_id = c.id
  ),
  filtrados as (
    select * from puntuados
    where not (select si from hay_texto) or puntaje_calc > 0
  )
  select
    f.id,
    f.slug,
    f.nombre,
    f.descripcion,
    f.logo_url,
    f.portada_url,
    f.horario,
    f.ciudad,
    z.nombre as zona,
    f.rubro_publico,
    f.puntaje_calc,
    f.cantidad_productos,
    coalesce(f.muestra, '[]'::jsonb),
    f.distancia::numeric,
    f.palabra,
    count(*) over ()
  from filtrados f
  left join public.zonas z on z.id = f.zona_id
  order by f.puntaje_calc desc, f.cantidad_productos desc, f.distancia asc nulls last, f.nombre
  limit 12
  offset (greatest(coalesce(p_pagina, 1), 1) - 1) * 12;
$$;

comment on function public.buscar_en_directorio(text[], text[], text, uuid, text, double precision, double precision, integer) is
  'El buscador del directorio. Solo negocios activos que eligieron aparecer, solo lo visible, y nunca coordenadas: la distancia sale redondeada a medio kilómetro.';

