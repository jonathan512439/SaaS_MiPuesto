-- Fase 12, etapa 2: el catálogo público pasa a paginar y filtrar en la consulta.
--
-- Hasta ahora el servidor mandaba el catálogo entero y el navegador mostraba
-- doce. Con 300 productos por negocio eso es una ficha completa de cada uno
-- viajando en cada visita para ver una docena.
--
-- Filtrar en Postgres obliga a resolver el acento: quien escribe "cafe" en el
-- celular tiene que encontrar "Café", y `ilike` por sí solo no lo hace. Se
-- guarda una copia normalizada del texto buscable.
--
-- Se usa `translate` y no la extensión `unaccent` porque `unaccent` no es
-- inmutable y por lo tanto no sirve en una columna generada, que es lo que
-- permite indexar. La lista cubre el español y deja ñ→n a propósito: quien
-- busca "banio" o "bano" encuentra "baño".

alter table public.productos
  add column texto_busqueda text
  generated always as (
    lower(
      translate(
        coalesce(nombre, '') || ' ' || coalesce(descripcion, ''),
        'áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙäëïöüÄËÏÖÜâêîôûÂÊÎÔÛñÑçÇ',
        'aeiouAEIOUaeiouAEIOUaeiouAEIOUaeiouAEIOUnNcC'
      )
    )
  ) stored;

comment on column public.productos.texto_busqueda is
  'Nombre y descripción en minúscula y sin acentos. Solo para buscar: nunca se muestra.';

-- Índice de trigramas: `ilike '%termino%'` no puede usar un índice común porque
-- el comodín va adelante.
create extension if not exists pg_trgm;

create index if not exists idx_productos_texto_busqueda
  on public.productos using gin (texto_busqueda gin_trgm_ops);

-- La columna es generada, así que nadie la escribe; solo hay que dejar leerla a
-- quien filtra desde el catálogo público.
grant select (texto_busqueda) on table public.productos to anon;
