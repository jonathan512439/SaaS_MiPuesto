-- Un negocio sin local aparece en el directorio de su ciudad.
--
-- Hay negocios que venden solo por internet, con envíos o entregas, y no
-- tienen una puerta que marcar en el mapa. Hasta acá, aparecer en el
-- directorio exigía ciudad **y** punto, y un negocio así tenía que inventarse
-- uno. Ahora elige «Sin local»: aparece con su ciudad y sin punto.
--
-- - `sin_local`, falso por omisión: los negocios de hoy no cambian.
-- - Aparecer exige ciudad, y el punto solo si tiene local. Sin local no guarda
--   un punto: no hay nada que ubicar, que es además lo más privado.
-- - La búsqueda devuelve `sin_local`. En el filtro por zona, uno sin local sale
--   en todas las de su ciudad; en «Cerca de mí» sin ciudad, solo si el
--   visitante está a menos de 100 km del centro de su ciudad.
--
-- La función cambia lo que devuelve, así que se borra y se vuelve a crear con
-- sus permisos. Probada en ensayo con
-- `supabase/tests/remote/directorio-sin-local.sql`.

alter table public.negocios
  add column sin_local boolean not null default false;

comment on column public.negocios.sin_local is
  'Vende sin un local que marcar en el mapa: por internet, con envíos o entregas. Aparece en el directorio con su ciudad y sin punto.';

alter table public.negocios
  drop constraint negocios_aparecer_exige_ubicacion,
  add constraint negocios_aparecer_exige_ubicacion check (
    aparece_en_directorio is not true
    or (ciudad is not null and (sin_local or ubicacion_lat is not null))
  ),
  add constraint negocios_sin_local_sin_punto check (
    not sin_local or (ubicacion_lat is null and ubicacion_lng is null)
  );

grant select (sin_local) on table public.negocios to anon, authenticated;
grant update (sin_local) on table public.negocios to authenticated;

drop function public.buscar_en_directorio(text[], text[], text, uuid, text, double precision, double precision, integer);

create function public.buscar_en_directorio(
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
  total bigint,
  sin_local boolean
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
      -- Un negocio sin local entrega en toda su ciudad: sale en cualquiera
      -- de sus zonas.
      and (
        p_zona_id is null
        or n.zona_id = p_zona_id
        or (n.sin_local and n.ciudad = (select zona.ciudad from public.zonas as zona where zona.id = p_zona_id))
      )
      -- «Cerca de mí» sin ciudad: uno sin local solo si el visitante está en
      -- su ciudad —a menos de 100 km de su centro, medido desde el punto
      -- redondeado—; si no, le llenaría la lista de negocios de otra ciudad.
      and (
        not n.sin_local
        or p_ciudad is not null
        or p_lat is null
        or p_lng is null
        or exists (
          select 1
          from private.centro_de_ciudad(n.ciudad) as centro
          where 2 * 6371 * asin(sqrt(
            power(sin(radians((centro.lat - round(p_lat::numeric, 2)::double precision) / 2)), 2)
            + cos(radians(round(p_lat::numeric, 2)::double precision)) * cos(radians(centro.lat))
              * power(sin(radians((centro.lng - round(p_lng::numeric, 2)::double precision) / 2)), 2)
          )) <= 100
        )
      )
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
        -- Redondeada a medio kilómetro: dice «a 1,5 km», no dónde está. Y
        -- medida desde el punto del visitante **redondeado a 0,01° (~1 km)**:
        -- la función está abierta a la clave pública, y sin esto quien la
        -- llame directo movería el punto de a metros hasta ver dónde salta la
        -- distancia, y ubicaría el local. Con el punto en su celda, moverse
        -- dentro de ella no cambia nada.
        else round(
          2 * 6371 * asin(sqrt(
            power(sin(radians((c.ubicacion_lat - round(p_lat::numeric, 2)::double precision) / 2)), 2)
            + cos(radians(round(p_lat::numeric, 2)::double precision)) * cos(radians(c.ubicacion_lat))
              * power(sin(radians((c.ubicacion_lng - round(p_lng::numeric, 2)::double precision) / 2)), 2)
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
    count(*) over (),
    f.sin_local
  from filtrados f
  left join public.zonas z on z.id = f.zona_id
  order by f.puntaje_calc desc, f.cantidad_productos desc, f.distancia asc nulls last, f.nombre
  limit 12
  offset (greatest(coalesce(p_pagina, 1), 1) - 1) * 12;
$$;

comment on function public.buscar_en_directorio(text[], text[], text, uuid, text, double precision, double precision, integer) is
  'El buscador del directorio. Solo negocios activos que eligieron aparecer, solo lo visible, y nunca coordenadas: la distancia sale redondeada a medio kilómetro, medida desde el punto del visitante redondeado a unos 1 km. Los negocios sin local salen con su ciudad y sin distancia.';

revoke all on function public.buscar_en_directorio(text[], text[], text, uuid, text, double precision, double precision, integer) from public;
grant execute on function public.buscar_en_directorio(text[], text[], text, uuid, text, double precision, double precision, integer) to anon, authenticated, service_role;
