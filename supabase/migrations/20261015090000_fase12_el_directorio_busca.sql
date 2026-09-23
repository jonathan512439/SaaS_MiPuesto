-- Fase 12: el directorio busca.
--
-- El detalle está en `docs/plan/09-DIRECTORIO-Y-FORMAS.md`. Lo que deja esta
-- migración:
--
--   1. `sinonimos_busqueda`: «juguetes» también busca «muñeca», «peluche».
--   2. `busquedas_sin_resultado`: qué buscó la gente y no encontró, sin nada de
--      quién lo buscó. Es el dato para saber qué sinónimo falta.
--   3. `buscar_en_directorio`: una sola función, la única puerta del buscador.
--   4. La purga de las búsquedas viejas, con su vigilancia.
--
-- **Un cambio respecto del plan, y por qué.** El plan pedía un `tsvector` en
-- español para que «juguetes» encontrara «juguete». No hace falta: la búsqueda
-- ya compara por **pedazo de texto** (`ilike '%…%'`) contra `texto_busqueda`,
-- que está en minúscula y sin tildes y tiene índice de trigramas. Buscando la
-- raíz —«juguet»— se encuentran «juguete», «juguetes» y «juguetería» de una vez,
-- sin sumar otra columna generada a `productos` ni otra forma de buscar que el
-- catálogo no usa. Los errores de tipeo los cubre la similitud de trigramas
-- (`<%`), que usa el mismo índice.

-- ---------------------------------------------------------------------------
-- 1. Sinónimos

create table public.sinonimos_busqueda (
  -- En minúscula y sin tildes, como llega la búsqueda ya normalizada.
  termino text primary key check (termino ~ '^[a-z0-9 ]{2,40}$'),
  equivalentes text[] not null check (
    cardinality(equivalentes) between 1 and 12
  ),
  creado_en timestamptz not null default now()
);

comment on table public.sinonimos_busqueda is
  'Palabras que el buscador del directorio suma a una búsqueda. Las cura la plataforma.';

alter table public.sinonimos_busqueda enable row level security;
revoke all on table public.sinonimos_busqueda from anon, authenticated;

create policy "plataforma_administra_sinonimos"
on public.sinonimos_busqueda for all to authenticated
using (public.es_admin_plataforma())
with check (public.es_admin_plataforma());

grant select, insert, update, delete on table public.sinonimos_busqueda to authenticated;
grant all on table public.sinonimos_busqueda to service_role;

-- Un punto de partida, editable desde Plataforma. Son los casos del plan y los
-- más obvios de un catálogo boliviano; lo demás lo van a decir las búsquedas
-- sin resultado.
insert into public.sinonimos_busqueda (termino, equivalentes) values
  ('juguetes', array['juguete', 'muneca', 'peluche', 'lego', 'pelota', 'carrito']),
  ('menu', array['almuerzo', 'plato', 'comida', 'carta']),
  ('ropa', array['polera', 'pantalon', 'vestido', 'chompa', 'camisa', 'blusa']),
  ('zapatos', array['zapato', 'zapatilla', 'calzado', 'bota', 'sandalia']),
  ('celular', array['telefono', 'funda', 'cargador', 'audifono']),
  ('torta', array['pastel', 'queque', 'postre']);

-- ---------------------------------------------------------------------------
-- 2. Lo que se buscó y no se encontró
--
-- El término y la ciudad, con un contador. **Sin IP, sin sesión, sin hora de
-- cada búsqueda**: lo que interesa es qué falta en el directorio, no quién lo
-- buscó.

create table public.busquedas_sin_resultado (
  termino text not null check (char_length(termino) between 2 and 60),
  ciudad text not null default '',
  cantidad integer not null default 1 check (cantidad >= 1),
  ultima_vez timestamptz not null default now(),
  primary key (termino, ciudad)
);

comment on table public.busquedas_sin_resultado is
  'Qué se buscó en el directorio y no dio resultados, contado por término y ciudad. Sin datos de quien buscó.';

alter table public.busquedas_sin_resultado enable row level security;
revoke all on table public.busquedas_sin_resultado from anon, authenticated;

create policy "plataforma_lee_busquedas_sin_resultado"
on public.busquedas_sin_resultado for select to authenticated
using (public.es_admin_plataforma());

grant select on table public.busquedas_sin_resultado to authenticated;
grant all on table public.busquedas_sin_resultado to service_role;

-- La anota el servidor con su clave, no el navegador: si la pudiera llamar
-- cualquiera, llenar la tabla de palabras inventadas sería un minuto de trabajo.
-- Igual lleva un techo, por si algo se escapa.
create or replace function public.registrar_busqueda_sin_resultado(
  p_termino text,
  p_ciudad text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_termino is null or char_length(p_termino) not between 2 and 60 then
    return;
  end if;
  if (select count(*) from public.busquedas_sin_resultado) >= 5000 then
    return;
  end if;

  insert into public.busquedas_sin_resultado as b (termino, ciudad)
  values (p_termino, coalesce(p_ciudad, ''))
  on conflict (termino, ciudad) do update
    set cantidad = b.cantidad + 1, ultima_vez = now();
end;
$$;

revoke all on function public.registrar_busqueda_sin_resultado(text, text) from public, anon, authenticated;
grant execute on function public.registrar_busqueda_sin_resultado(text, text) to service_role;

create or replace function public.purgar_busquedas_sin_resultado(p_dias integer default 90)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_borradas integer;
begin
  delete from public.busquedas_sin_resultado
  where ultima_vez < now() - make_interval(days => p_dias);
  get diagnostics v_borradas = row_count;
  return v_borradas;
end;
$$;

revoke all on function public.purgar_busquedas_sin_resultado(integer) from public, anon, authenticated;
grant execute on function public.purgar_busquedas_sin_resultado(integer) to service_role;

-- ---------------------------------------------------------------------------
-- 3. La búsqueda
--
-- La única puerta del buscador, y por eso la que sostiene las reglas:
--
--   · Solo negocios **activos** que **eligieron aparecer**.
--   · Solo productos visibles y fuera de la papelera, y categorías visibles.
--   · **Nunca devuelve coordenadas.** Con «cerca de mí» devuelve una distancia
--     redondeada a medio kilómetro.
--
-- Las palabras llegan ya normalizadas desde el servidor (minúscula, sin tildes,
-- sin signos). Acá se les suman los sinónimos y se les saca la terminación de
-- plural, y un negocio coincide si coincide **cualquiera** de esas raíces.
--
-- El orden: coincide el negocio o su rubro, después una categoría, después un
-- producto; a igualdad, más coincidencias primero, y con «cerca de mí» el más
-- cercano. Que esté abierto ahora lo decide el horario, que se evalúa en
-- TypeScript: se ordena ahí, dentro de la página.

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
  expandidas as (
    select w from palabras
    union
    select unnest(s.equivalentes)
    from public.sinonimos_busqueda s
    join palabras p on s.termino = p.w
  ),
  raices as (
    select distinct
      case when char_length(w) > 4 then regexp_replace(w, '(es|s)$', '') else w end as r
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
      p.orden
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
    count(*) over ()
  from filtrados f
  left join public.zonas z on z.id = f.zona_id
  order by f.puntaje_calc desc, f.cantidad_productos desc, f.distancia asc nulls last, f.nombre
  limit 12
  offset (greatest(coalesce(p_pagina, 1), 1) - 1) * 12;
$$;

comment on function public.buscar_en_directorio(text[], text[], text, uuid, text, double precision, double precision, integer) is
  'El buscador del directorio. Solo negocios activos que eligieron aparecer, solo lo visible, y nunca coordenadas: la distancia sale redondeada a medio kilómetro.';

revoke all on function public.buscar_en_directorio(text[], text[], text, uuid, text, double precision, double precision, integer) from public;
grant execute on function public.buscar_en_directorio(text[], text[], text, uuid, text, double precision, double precision, integer) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. La purga, y su vigilancia
--
-- Tres lugares tienen que decir lo mismo, y la guardia de tareas lo comprueba:
-- esta programación, `estado_tareas()` y el postámbulo de restauración.

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'mipuesto-purgar-busquedas';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'mipuesto-purgar-busquedas',
    '45 8 * * *',
    $cron$select public.purgar_busquedas_sin_resultado();$cron$
  );
end;
$$;

create or replace function public.estado_tareas()
returns table (
  tarea text,
  ultima_corrida timestamptz,
  minutos_desde numeric,
  tolerancia_minutos integer,
  nunca_corrio boolean,
  atrasada boolean
)
language sql
security definer
set search_path = ''
as $$
  with esperadas(nombre, tolerancia) as (
    values
      ('mipuesto-expirar-reservas', 20),
      -- Cada cinco minutos, igual que expirar reservas: con veinte de plazo, tres
      -- fallos seguidos ya cuentan como detenida.
      ('mipuesto-vigilar-salud', 20),
      ('mipuesto-purgar-analitica', 1560),
      ('mipuesto-suspender-vencidos', 1560),
      ('mipuesto-purgar-vigilancia', 1560),
      -- Fase 12: una vez por día, como las otras purgas.
      ('mipuesto-purgar-busquedas', 1560)
  ),
  ultimas as (
    select
      e.nombre,
      e.tolerancia,
      max(d.end_time) filter (where d.status = 'succeeded') as ultima,
      count(j.jobid) as programada
    from esperadas e
    left join cron.job j on j.jobname = e.nombre
    left join cron.job_run_details d on d.jobid = j.jobid
    group by e.nombre, e.tolerancia
  )
  select
    nombre::text,
    ultima,
    round(extract(epoch from (now() - ultima)) / 60, 1),
    tolerancia,
    ultima is null,
    /* Una tarea que ni siquiera está programada sí es una falla: alguien la
       borró o la migración no se aplicó. */
    programada = 0
      or (ultima is not null and now() - ultima > make_interval(mins => tolerancia))
  from ultimas
  order by nombre;
$$;

revoke all on function public.estado_tareas() from public, anon, authenticated;
grant execute on function public.estado_tareas() to service_role;
