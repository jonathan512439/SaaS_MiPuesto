/* Estas listas estaban escritas a mano en cinco archivos. Al agregar
   `en_carta_hasta` se actualizaron cuatro y se olvidó el quinto —duplicar—, que
   devolvía un producto sin ese campo: el tipo decía que estaba y no estaba.
   Escritas una sola vez, esa clase de error deja de ser posible.

   Van como texto literal y no como arreglo unido con `join`: el cliente de la
   base infiere el tipo del resultado a partir del literal, y un `string` a
   secas le hace devolver `unknown`. */
export const COLUMNAS_PRODUCTO_ADMIN =
  "id,codigo,categoria_id,subcategoria_id,nombre,descripcion,precio,precio_anterior,precio_actualizado_en,precio_actualizado_por,fotos,controla_stock,cantidad_stock,cantidad_reservada,visible,estado,orden,en_carta_hasta" as const;

/* El catálogo público pide menos a propósito: lo que no viaja no se puede
   filtrar por error ni aparecer en el HTML servido. */
export const COLUMNAS_PRODUCTO_PUBLICO =
  "id,codigo,categoria_id,subcategoria_id,nombre,descripcion,precio,fotos,controla_stock,cantidad_stock,cantidad_reservada,estado,visible,orden,en_carta_hasta" as const;

/* El menú impreso no muestra existencias ni reservas: es una hoja de papel. */
export const COLUMNAS_PRODUCTO_IMPRESO =
  "id,codigo,categoria_id,subcategoria_id,nombre,descripcion,precio,fotos,estado,visible,orden,en_carta_hasta" as const;
