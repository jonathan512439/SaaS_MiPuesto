-- La poda de la fase 6: se van las columnas de los dos ejes que ya no existen.
--
-- Hubo tres ejes de apariencia —plantilla × tarjeta × paleta— pensados para dar
-- doce catálogos donde había cuatro. Al adoptar el diseño de `Catalogos_Ejemplo/`
-- se vio que el reparto estaba mal hecho: lo que distingue a una veterinaria de
-- una ferretería no es la estructura de la página ni la forma de la tarjeta, son
-- sus categorías, sus campos y sus acciones. Queda un solo diseño de catálogo y
-- un solo eje de apariencia, el color.
--
-- **Esta migración corre al final y a propósito.** El plan la dejó condicionada
-- a verificar el catálogo nuevo en producción, porque borrar una columna no se
-- deshace con un `undo`: si el diseño único hubiera fallado en un teléfono real,
-- volver atrás con las columnas ya borradas habría significado restaurar de un
-- respaldo. Se verificó primero; recién después se poda.
--
-- No hay nada que migrar de contenido: el código dejó de leer las dos columnas
-- en el commit anterior, así que lo que guardan ya no lo mira nadie.

alter table public.negocios
  drop constraint if exists negocios_plantilla_id_check,
  drop constraint if exists negocios_tarjeta_id_check;

alter table public.negocios
  drop column if exists plantilla_id,
  drop column if exists tarjeta_id;
