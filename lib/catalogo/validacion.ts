import type { DatosProductoEntrada } from "./tipos";

export const LIMITE_CATEGORIAS = 40;
export const LIMITE_SUBCATEGORIAS_POR_CATEGORIA = 20;
/* Sube a 300 recién ahora: con la paginación en el navegador, cada visita
   descargaba la ficha de todos los productos para mostrar doce, así que subir
   el límite antes habría empeorado el catálogo en vez de mejorarlo. */
export const LIMITE_PRODUCTOS = 300;

/* Cuántas fotografías admite un producto. Vive acá porque la comprueban tres
   lugares que no se hablan entre sí: el panel al elegir los archivos, la ruta
   que las recibe, y ahora la pantalla de revisión de una importación. Estaba
   escrito a mano en cada uno, y tres números sueltos que tienen que coincidir
   terminan no coincidiendo: el día que suba a seis, el panel dejaría elegir
   seis y la ruta rechazaría las dos últimas sin explicar por qué. */
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

export function validarProducto(entrada: unknown):
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
  const precio =
    typeof valor.precio === "number"
      ? valor.precio
      : typeof valor.precio === "string" && valor.precio.trim()
        ? Number(valor.precio.replace(",", "."))
        : Number.NaN;
  const controlaStock = valor.controla_stock === true;
  const cantidadStock = controlaStock
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

  if (!Number.isFinite(precio) || precio < 0 || precio > 9_999_999.99) {
    errores.precio = "Escribe un precio válido mayor o igual a cero.";
  } else if (Math.round(precio * 100) !== precio * 100) {
    errores.precio = "El precio admite como máximo dos decimales.";
  }

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

  if (Object.keys(errores).length > 0) return { correcto: false, errores };

  return {
    correcto: true,
    datos: {
      nombre,
      descripcion,
      precio: Number(precio.toFixed(2)),
      categoria_id: categoriaId as string | null,
      subcategoria_id: subcategoriaId as string | null,
      controla_stock: controlaStock,
      cantidad_stock: cantidadStock,
      duracion_minutos: duracion,
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
