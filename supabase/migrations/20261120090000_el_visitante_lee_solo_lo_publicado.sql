-- El visitante lee de un producto solo lo que el catálogo publica.
--
-- Dos cosas de la misma clase, encontradas con la clave pública contra
-- producción (auditorías del 2026-10-21 y del 2026-11-15).
--
-- 1. `productos` le concedía a la clave pública la tabla entera, desde el
--    esquema inicial. El catálogo pide veinte columnas, pero cualquiera podía
--    pedir las otras: `precio_actualizado_por` —el identificador del dueño que
--    cambió el precio—, `precio_actualizado_en` y `precio_anterior`. Son el
--    rastro de auditoría de los precios (`SECURITY.md`, «Registro de auditoría
--    mínimo»), que sirve para resolver una disputa con el negocio, no para que
--    la competencia lea cuándo y de cuánto a cuánto subió cada cosa.
--
--    Pasa a concederse **columna por columna**, como `negocios`. Se conceden
--    todas las que hoy existen menos esas tres: quitar más sería arriesgar una
--    consulta del catálogo por nada. Lo que viene con eso, y ya pasó dos veces
--    con `negocios`: **una columna nueva no queda concedida sola**. Lo cuida
--    `lib/catalogo/columnas-publicas-de-producto.test.ts`, que no deja agregar
--    una columna a `productos` sin decir si el visitante la lee.
--
-- 2. Las presentaciones —tallas, tamaños— se leían con que el negocio
--    estuviera activo, sin mirar el producto: las de un producto oculto o en la
--    papelera seguían a la vista, con su nombre, su precio y sus existencias.
--    Ahora se leen las de los productos que se ven.
--
-- Nada cambia para el catálogo: pide las mismas columnas, y las presentaciones
-- viajan dentro de cada producto visible.

-- 1. Quitar el permiso sobre la tabla quita también los que había por columna
--    (`texto_busqueda`, `en_carta_hasta`, `duracion_minutos`, `recurso_id`):
--    por eso van todas de nuevo en la lista.
revoke select on table public.productos from anon;

grant select (
  id,
  negocio_id,
  categoria_id,
  subcategoria_id,
  codigo,
  nombre,
  descripcion,
  precio,
  fotos,
  controla_stock,
  cantidad_stock,
  cantidad_reservada,
  reservado_hasta,
  estado,
  visible,
  eliminado_en,
  orden,
  creado_en,
  en_carta_hasta,
  atributos,
  texto_busqueda,
  duracion_minutos,
  recurso_id,
  tipo_presentacion,
  con_presentaciones
) on table public.productos to anon;

comment on column public.productos.precio_actualizado_por is
  'Quién cambió el precio por última vez. Rastro de auditoría: no se concede a la clave pública.';
comment on column public.productos.precio_actualizado_en is
  'Cuándo cambió el precio por última vez. Rastro de auditoría: no se concede a la clave pública.';
comment on column public.productos.precio_anterior is
  'El precio antes del último cambio. Rastro de auditoría: no se concede a la clave pública.';

-- 2. Las presentaciones, solo las de productos a la vista. La misma condición
--    que `productos_publicos_visibles`, escrita entera: no depende de que la
--    política de `productos` siga diciendo lo mismo.
alter policy "variantes_publicas_activas" on public.variantes_producto
using (
  exists (
    select 1 from public.negocios
    where negocios.id = variantes_producto.negocio_id and negocios.activo = true
  )
  and exists (
    select 1 from public.productos
    where productos.id = variantes_producto.producto_id
      and productos.visible = true
      and productos.eliminado_en is null
  )
);

notify pgrst, 'reload schema';
