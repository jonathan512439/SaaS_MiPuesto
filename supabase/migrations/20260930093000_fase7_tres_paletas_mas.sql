-- Las tres paletas que faltaban para llegar a diez.
--
-- «selva» (verde bosque con acento ámbar), «cobre» (cobre con acento petróleo)
-- y «pizarra», que es la segunda paleta oscura: hasta ahora «noche» era la única
-- y un negocio que quería fondo oscuro no tenía con qué variar.
--
-- La restricción se reemplaza en vez de ampliarse porque Postgres no permite
-- editar un check existente; los siete valores que ya estaban siguen dentro de
-- la lista, así que ningún negocio queda inválido.
alter table public.negocios
  drop constraint negocios_paleta_id_check;

alter table public.negocios
  add constraint negocios_paleta_id_check
  check (paleta_id in (
    'mercado', 'tierra', 'oceano', 'noche', 'altiplano', 'jazmin', 'grafito',
    'selva', 'cobre', 'pizarra'
  ));
