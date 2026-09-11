-- Buscar por el valor de un campo.
--
-- En una casa de repuestos nadie busca «filtro»: busca «filtro Corolla 2015». En
-- una ferretería nadie busca «foco»: busca «foco E27». Con el buscador mirando
-- solo nombre y descripción, esas búsquedas no encuentran nada aunque el dato
-- esté cargado, y el dueño concluye que el catálogo no sirve.
--
-- Se suman los valores de `atributos` a la columna generada que ya existe.

alter table public.productos
  drop column texto_busqueda;

-- `atributos::text` y no una extracción campo por campo, por dos razones. Una:
-- la columna es generada y solo admite expresiones inmutables, y recorrer un
-- objeto para quedarse con los valores exige una función que no lo es. La otra:
-- el texto completo incluye también los **nombres de las claves**, así que
-- «casquillo e27» encuentra lo mismo que «e27», y eso es lo que alguien escribe.
--
-- El ruido que agrega —llaves, comillas, dos puntos— no molesta: la búsqueda es
-- por `ilike '%termino%'` con términos ya limpios de puntuación, así que ninguno
-- de esos signos puede llegar a formar parte de un término.
alter table public.productos
  add column texto_busqueda text
  generated always as (
    lower(
      translate(
        coalesce(nombre, '') || ' ' ||
        coalesce(descripcion, '') || ' ' ||
        coalesce(atributos::text, ''),
        'áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙäëïöüÄËÏÖÜâêîôûÂÊÎÔÛñÑçÇ',
        'aeiouAEIOUaeiouAEIOUaeiouAEIOUaeiouAEIOUnNcC'
      )
    )
  ) stored;

comment on column public.productos.texto_busqueda is
  'Nombre, descripción y valores de los campos, en minúscula y sin acentos. Solo para buscar: nunca se muestra.';

create index if not exists idx_productos_texto_busqueda
  on public.productos using gin (texto_busqueda gin_trgm_ops);

-- El `grant` se vuelve a dar: al borrar la columna se fue con ella. Es el tipo
-- de olvido que deja el buscador del catálogo público devolviendo cero
-- resultados sin ningún error a la vista.
grant select (texto_busqueda) on table public.productos to anon;
grant select (texto_busqueda) on table public.productos to authenticated;
grant select (texto_busqueda) on table public.productos to service_role;
