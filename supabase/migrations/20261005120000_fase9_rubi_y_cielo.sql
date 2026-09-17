-- Las dos últimas paletas: «rubi» (negro con rojo) y «cielo» (blanco con azul).
--
-- En la misma tanda cambiaron de color, sin cambiar de identificador, «noche»
-- —que pasa a ser «Día y noche», con los cuatro tonos que eligió el dueño— y
-- «abeja», que dejó el negro y el amarillo para ser una paleta clara de comida.
-- Los identificadores se conservan porque son lo que está guardado en la fila de
-- cada negocio; lo que cambió vive en el CSS y en `lib/apariencia.ts`.
--
-- La restricción se reemplaza en vez de ampliarse porque Postgres no permite
-- editar un check existente; los catorce valores que ya estaban siguen dentro de
-- la lista, así que ningún negocio queda inválido.
alter table public.negocios
  drop constraint negocios_paleta_id_check;

alter table public.negocios
  add constraint negocios_paleta_id_check
  check (paleta_id in (
    'mercado', 'tierra', 'oceano', 'noche', 'altiplano', 'jazmin', 'grafito',
    'selva', 'cobre', 'pizarra', 'rosal', 'amapola', 'abeja', 'dorado',
    'rubi', 'cielo'
  ));
