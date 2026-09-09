-- Los dos banners del catálogo.
--
-- Aparecen en casi todas las maquetas de `Catalogos_Ejemplo/`: una franja ancha
-- debajo de la portada y otra antes del pie. Sirven para una promoción, un aviso
-- —«cerrado el 6 de agosto»— o publicidad propia del negocio.
--
-- **Van en `jsonb` y no en una tabla**, siguiendo a `redes_sociales`, que es la
-- misma clase de cosa: una lista corta, acotada, propia del negocio, que se lee
-- siempre junto con él y nunca se consulta por su cuenta. Una tabla sumaría una
-- política de RLS, una ida más a la base en el camino público y un `join` en la
-- consulta que más importa, a cambio de nada.
--
-- **Son dos y no una lista libre.** Tres franjas de publicidad en un catálogo de
-- barrio es un catálogo que no se lee. El techo va acá y no solo en el
-- validador: la ruta se puede saltar con la clave privilegiada.
--
-- La posición es la del arreglo: el primero arriba, el segundo abajo. Sin campo
-- `posicion`, que sería un dato más que puede quedar en dos estados que se
-- contradicen.

alter table public.negocios
  add column banners jsonb not null default '[]'::jsonb;

alter table public.negocios
  add constraint negocios_banners_es_lista_corta check (
    jsonb_typeof(banners) = 'array' and jsonb_array_length(banners) <= 2
  );

comment on column public.negocios.banners is
  'Hasta dos banners del catálogo, en orden: el primero va arriba y el segundo abajo. Cada uno es {imagen, alt, enlace}. La forma se valida en lib/negocios/banners.ts; acá solo se acota el largo.';

-- Los permisos, columna por columna, como el resto de esta tabla. El dueño
-- publica sus banners y el catálogo público los lee; nadie más toca nada.
grant update (banners) on table public.negocios to authenticated;
grant select (banners) on table public.negocios to anon;
