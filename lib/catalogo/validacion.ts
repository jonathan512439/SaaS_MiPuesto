import type { DatosProductoEntrada } from "./tipos";

export const LIMITE_CATEGORIAS = 40;
export const LIMITE_SUBCATEGORIAS_POR_CATEGORIA = 20;
/* El techo técnico de productos: ningún plan puede incluir más sin revisar
   primero el catálogo público, que se pensó y midió para 300 (con la paginación
   en el navegador, cada visita descargaba la ficha de todos los productos).
   **Cuántos incluye cada plan** vive en `lib/planes.ts` y lo aplica la base. */
export const LIMITE_PRODUCTOS = 300;

/* Cuántas fotografías admite un producto. Vive acá porque la comprueban tres
   lugares que no se hablan entre sí: el panel al elegir los archivos, la ruta
   que las recibe, y ahora la pantalla de revisión de una importación. Estaba
   escrito a mano en cada uno, y tres números sueltos que tienen que coincidir
   terminan no coincidiendo: el día que suba a seis, el panel dejaría elegir
   seis y la ruta rechazaría las dos últimas sin explicar por qué. */
/* Es el **techo físico**, el `check (cardinality(fotos) <= 4)` de la base.
   Cuántas incluye cada plan vive en `lib/planes.ts`: las pantallas y las rutas
   usan esas, nunca esta. */
export const MAXIMO_FOTOS_POR_PRODUCTO = 4;
export const LARGO_MAXIMO_NOMBRE_PRODUCTO = 120;

const PATRON_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function esUuid(valor: unknown): valor is string {
  return typeof valor === "string" && PATRON_UUID.test(valor);
}

export function validarNombreOrganizacion(valor: unknown) {
  if (typeof valor !== "string") return "Escribe un nombre válido.";
  const nombre = valor.trim();
  if (!nombre) return "El nombre es obligatorio.";
  if (nombre.length > 80) return "Usa como máximo 80 caracteres.";
  return "";
}

export function normalizarNombreOrganizacion(valor: string) {
  return valor.trim().replace(/\s+/g, " ");
}

/* El precio de un producto, como lo escribió el dueño.
 *
 * Es opcional (fase 14): vacío es «sin precio», y el catálogo muestra el
 * producto con «Consultar por WhatsApp». Vacío, nulo o 0 se guardan como nulo,
 * para que haya un solo valor. El campo tiene que venir igual —vacío, pero
 * venir—: un guardado al que le falta no borra un precio por descuido.
 *
 * Lo usan el formulario entero y el precio que se pone desde la fila de la
 * lista, para que los dos acepten exactamente lo mismo. */
export function leerPrecioProducto(
  valor: unknown,
): { correcto: true; precio: number | null } | { correcto: false; error: string } {
  if (valor === null || (typeof valor === "string" && valor.trim() === "")) {
    return { correcto: true, precio: null };
  }
  const precio =
    typeof valor === "number"
      ? valor
      : typeof valor === "string"
        ? Number(valor.trim().replace(",", "."))
        : Number.NaN;
  if (!Number.isFinite(precio) || precio < 0 || precio > 9_999_999.99) {
    return { correcto: false, error: "Escribe un precio válido, o déjalo vacío para que te lo consulten." };
  }
  /* Con margen y no con igualdad: en coma flotante 19.99 × 100 da
     1998.9999999999998, y la igualdad rechazaba 19,99, 1,15 o 4,35 como si
     tuvieran tres decimales. */
  if (Math.abs(precio * 100 - Math.round(precio * 100)) > 1e-6) {
    return { correcto: false, error: "El precio admite como máximo dos decimales." };
  }
  return { correcto: true, precio: precio === 0 ? null : Number(precio.toFixed(2)) };
}

export function validarProducto(
  entrada: unknown,
  /* Con presentaciones y control de existencias, las existencias van en cada
     presentación y el producto no lleva las suyas (fase 13): no se le exigen y
     se guardan en nulo, que es lo que la base deja igual. */
  opciones: { existenciasPorPresentacion?: boolean } = {},
):
  | { correcto: true; datos: DatosProductoEntrada }
  | { correcto: false; errores: Record<string, string> } {
  if (typeof entrada !== "object" || entrada === null) {
    return { correcto: false, errores: { general: "Los datos enviados no son válidos." } };
  }

  const valor = entrada as Record<string, unknown>;
  const errores: Record<string, string> = {};
  const nombre =
    typeof valor.nombre === "string" ? valor.nombre.trim().replace(/\s+/g, " ") : "";
  const descripcion =
    typeof valor.descripcion === "string" && valor.descripcion.trim()
      ? valor.descripcion.trim()
      : null;
  const precio = leerPrecioProducto(valor.precio);
  const controlaStock = valor.controla_stock === true;
  const cantidadStock = controlaStock && !opciones.existenciasPorPresentacion
    ? typeof valor.cantidad_stock === "number"
      ? valor.cantidad_stock
      : typeof valor.cantidad_stock === "string" && valor.cantidad_stock.trim()
        ? Number(valor.cantidad_stock)
        : Number.NaN
    : null;
  const categoriaId =
    valor.categoria_id === null || valor.categoria_id === "" ? null : valor.categoria_id;
  const subcategoriaId =
    valor.subcategoria_id === null || valor.subcategoria_id === "" ? null : valor.subcategoria_id;

  if (!nombre) errores.nombre = "El nombre es obligatorio.";
  else if (nombre.length > LARGO_MAXIMO_NOMBRE_PRODUCTO)
    errores.nombre = `Usa como máximo ${LARGO_MAXIMO_NOMBRE_PRODUCTO} caracteres.`;

  if (descripcion && descripcion.length > 1000) {
    errores.descripcion = "Usa como máximo 1000 caracteres.";
  }

  if (!precio.correcto) errores.precio = precio.error;

  if (categoriaId !== null && !esUuid(categoriaId)) {
    errores.categoria_id = "La categoría seleccionada no es válida.";
  }
  if (subcategoriaId !== null && !esUuid(subcategoriaId)) {
    errores.subcategoria_id = "La subcategoría seleccionada no es válida.";
  }
  if (subcategoriaId !== null && categoriaId === null) {
    errores.subcategoria_id = "Elige primero una categoría.";
  }

  if (
    controlaStock &&
    !opciones.existenciasPorPresentacion &&
    (cantidadStock === null ||
      !Number.isInteger(cantidadStock) ||
      cantidadStock < 0 ||
      cantidadStock > 999_999)
  ) {
    errores.cantidad_stock = "Escribe una cantidad entera entre 0 y 999999.";
  }

  /* La duración de un servicio. Vacía significa «la de mi categoría», que es lo
     normal: el dueño solo la escribe donde de verdad es distinta. Los topes son
     los mismos que hace cumplir la base. */
  const duracionCruda = valor.duracion_minutos;
  let duracion: number | null = null;
  if (duracionCruda !== undefined && duracionCruda !== null && duracionCruda !== "") {
    const numero = typeof duracionCruda === "number" ? duracionCruda : Number(duracionCruda);
    if (!Number.isInteger(numero) || numero < 5 || numero > 480) {
      errores.duracion_minutos = "La duración va entre 5 y 480 minutos.";
    } else {
      duracion = numero;
    }
  }

  /* Quién atiende. Se comprueba la forma; que sea de este negocio lo comprueba
     la ruta, que es la que sabe de quién es la sesión. */
  const recursoCrudo = valor.recurso_id;
  const recursoId =
    recursoCrudo === undefined || recursoCrudo === null || recursoCrudo === "" ? null : recursoCrudo;
  if (recursoId !== null && !esUuid(recursoId)) {
    errores.recurso_id = "Elige quién atiende de la lista.";
  }

  if (Object.keys(errores).length > 0) return { correcto: false, errores };

  return {
    correcto: true,
    datos: {
      nombre,
      descripcion,
      precio: precio.correcto ? precio.precio : null,
      categoria_id: categoriaId as string | null,
      subcategoria_id: subcategoriaId as string | null,
      controla_stock: controlaStock,
      cantidad_stock: cantidadStock,
      duracion_minutos: duracion,
      recurso_id: recursoId as string | null,
    },
  };
}

export function estadoPorStock(
  controlaStock: boolean,
  cantidadStock: number | null,
  cantidadReservada = 0,
) {
  if (!controlaStock) return "disponible";
  if (cantidadStock === 0) return "agotado";
  return (cantidadStock ?? 0) - cantidadReservada <= 0 ? "reservado" : "disponible";
}
