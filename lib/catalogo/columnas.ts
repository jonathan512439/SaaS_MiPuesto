/* Estas listas estaban escritas a mano en cinco archivos. Al agregar
   `en_carta_hasta` se actualizaron cuatro y se olvidó el quinto —duplicar—, que
   devolvía un producto sin ese campo: el tipo decía que estaba y no estaba.
   Escritas una sola vez, esa clase de error deja de ser posible.

   Van como texto literal y no como arreglo unido con `join`: el cliente de la
   base infiere el tipo del resultado a partir del literal, y un `string` a
   secas le hace devolver `unknown`. */
export const COLUMNAS_PRODUCTO_ADMIN =
  "id,codigo,categoria_id,subcategoria_id,nombre,descripcion,precio,precio_anterior,precio_actualizado_en,precio_actualizado_por,fotos,controla_stock,cantidad_stock,cantidad_reservada,visible,estado,orden,en_carta_hasta,atributos,duracion_minutos,recurso_id,con_presentaciones,tipo_presentacion" as const;

/* El catálogo público pide menos a propósito: lo que no viaja no se puede
   filtrar por error ni aparecer en el HTML servido. */
export const COLUMNAS_PRODUCTO_PUBLICO =
  "id,codigo,categoria_id,subcategoria_id,nombre,descripcion,precio,fotos,controla_stock,cantidad_stock,cantidad_reservada,estado,visible,orden,en_carta_hasta,atributos,duracion_minutos,recurso_id,con_presentaciones,tipo_presentacion" as const;

/* El menú impreso no muestra existencias ni reservas: es una hoja de papel. */
export const COLUMNAS_PRODUCTO_IMPRESO =
  "id,codigo,categoria_id,subcategoria_id,nombre,descripcion,precio,fotos,estado,visible,orden,en_carta_hasta" as const;

/* Lo mismo, más el orden de la categoría a la que pertenece el producto.
 *
 * No es un dato que se muestre: es **por lo que se ordena**. La lista paginada
 * tiene que entregar los productos agrupados por categoría y en el orden en que
 * el dueño puso sus categorías, y PostgREST solo deja ordenar por una columna
 * de otra tabla si esa tabla viaja en el `select` —lo dice con todas las letras
 * cuando no está—.
 *
 * Es un número por producto. Va contra la regla de que el catálogo público pide
 * lo mínimo, y se acepta porque sin él las páginas se cortan en el medio de una
 * categoría y los productos de la segunda tanda aparecen más arriba de donde
 * está mirando el cliente. */
export const COLUMNAS_PRODUCTO_PUBLICO_PAGINADO =
  `${COLUMNAS_PRODUCTO_PUBLICO},categorias(orden)` as const;

/* La categoría dejó de ser un nombre con un orden: ahora lleva su ícono, si su
   esfera se muestra y qué vende. Escrita acá por el mismo motivo que las de
   producto —estaba repetida en cinco lugares y al agregar una columna se olvidó
   uno—, y con la misma forma de literal, para que el cliente de la base pueda
   inferir el tipo del resultado. */
export const COLUMNAS_CATEGORIA = "id,nombre,orden,icono,visible,vende" as const;

/* Los campos de todas las categorías del negocio: el formulario de producto y
   la importación de planillas los cruzan con la categoría elegida. */
export const COLUMNAS_ATRIBUTO_CATEGORIA =
  "categoria_id,clave,nombre,tipo,unidad,opciones,obligatorio,en_tarjeta,en_resumen,orden" as const;
