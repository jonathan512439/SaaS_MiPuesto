-- Cuatro paletas más, y tres cambiadas de color.
--
-- Las nuevas: «rosal» para pastelerías, «amapola» para florerías, «abeja»
-- (negro con amarillo) y «dorado» (negro con dorado y champán). Las pidió el
-- dueño después de ver las diez que había: faltaban los rubros donde el color
-- es parte de lo que se vende.
--
-- Las tres que cambiaron —«oceano», «altiplano» y «pizarra»— **conservan su
-- identificador**. Eso es a propósito: es lo que hay guardado en la fila de cada
-- negocio, y renombrarlas obligaría a migrar datos para no ganar nada. Lo que
-- cambió son sus colores y su nombre en pantalla, que viven en el CSS y en
-- `lib/apariencia.ts`.
--
-- La restricción se reemplaza en vez de ampliarse porque Postgres no permite
-- editar un check existente; los diez valores que ya estaban siguen dentro de la
-- lista, así que ningún negocio queda inválido.
alter table public.negocios
  drop constraint negocios_paleta_id_check;

alter table public.negocios
  add constraint negocios_paleta_id_check
  check (paleta_id in (
    'mercado', 'tierra', 'oceano', 'noche', 'altiplano', 'jazmin', 'grafito',
    'selva', 'cobre', 'pizarra', 'rosal', 'amapola', 'abeja', 'dorado'
  ));
