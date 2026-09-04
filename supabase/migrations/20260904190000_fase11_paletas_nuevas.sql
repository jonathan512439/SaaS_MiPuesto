-- Tres paletas mas para el catalogo publico. La restriccion se reemplaza en vez
-- de ampliarse porque Postgres no permite editar un check existente; los valores
-- que ya estaban siguen dentro de la lista, asi que ningun negocio queda invalido.
alter table public.negocios
  drop constraint negocios_paleta_id_check;

alter table public.negocios
  add constraint negocios_paleta_id_check
  check (paleta_id in (
    'mercado', 'tierra', 'oceano', 'noche', 'altiplano', 'jazmin', 'grafito'
  ));
