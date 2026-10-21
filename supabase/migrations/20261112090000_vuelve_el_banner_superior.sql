-- Vuelve el banner superior, a pedido del dueño (2026-10-21).
--
-- Con un solo banner, el que tenía una imagen para arriba la subía como
-- portada —era lo único que había arriba— y la portada se veía como un banner:
-- el dueño lo leyó como que la portada se guardaba en el primer banner. Ahora
-- son dos lugares, y la portada queda como la foto del negocio:
--
--   banners[0]  inferior: entre dos categorías, a la mitad. El de siempre: se
--               queda en el lugar 0 para que ningún negocio vea mudarse el suyo.
--   banners[1]  superior: debajo de las categorías y arriba de los primeros
--               productos.
--
-- Solo se agranda el techo de la lista. Lo que ya está guardado cumple igual.

alter table public.negocios
  drop constraint negocios_banners_es_lista_corta;

alter table public.negocios
  add constraint negocios_banners_es_lista_corta check (
    jsonb_typeof(banners) = 'array' and jsonb_array_length(banners) <= 2
  );

comment on column public.negocios.banners is
  'Banners de publicidad del catálogo: [0] inferior, entre dos categorías; [1] superior, debajo de las categorías y arriba de los primeros productos. Cada uno con imagen, texto alternativo y, opcional, texto encima y botón.';
