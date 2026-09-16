import { armarXlsx } from "./xlsx";

/* El catálogo del negocio, en una planilla que el propio importador vuelve a
 * entender.
 *
 * **Las cinco primeras columnas no están elegidas por gusto**: son exactamente
 * las que `lib/importacion/columnas.ts` sabe reconocer, y con los títulos que
 * busca. Eso es lo que convierte a este archivo en una salida de verdad y no en
 * un souvenir: el dueño que se va puede llevárselo, y el que cambia de rubro
 * puede volver a cargarlo después de que el sistema le vacíe el catálogo.
 *
 * Las que siguen —código, si está publicado, la subcategoría— son para que el
 * dueño se entienda mirando la planilla. El importador las ignora, y está bien:
 * el código lo asigna el sistema y no tendría sentido que viniera de afuera.
 *
 * **Lo que esta planilla no guarda**, y hay que decirlo en voz alta porque es la
 * red de seguridad del cambio de rubro: los campos propios de cada categoría,
 * las presentaciones con su precio, las fotografías y los horarios de agenda.
 * Una hoja de cálculo es una tabla, y eso no entra en una tabla sin inventar un
 * formato que después nadie sabría volver a leer. Quien cambie de rubro pierde
 * esas cosas, y tiene que enterarse antes y no después.
 */

export type ProductoExportable = {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  categoria: string | null;
  subcategoria: string | null;
  controla_stock: boolean;
  cantidad_stock: number | null;
  visible: boolean;
};

/* Los títulos, con las palabras que el importador busca. Cambiar uno acá rompe
   el regreso en silencio: la planilla se seguiría abriendo, pero esa columna
   entraría sin reconocer y el dueño tendría que asignarla a mano sin saber por
   qué. Hay una prueba que lo comprueba importando lo que esta función exporta. */
const TITULOS = [
  "Producto",
  "Precio",
  "Descripción",
  "Categoría",
  "Cantidad",
  "Código",
  "Subcategoría",
  "Publicado",
] as const;

/* Con punto decimal y sin separador de miles: es la única forma que el XML de
   Excel acepta como número, y la que el importador vuelve a leer sin depender de
   si la computadora del dueño usa coma o punto. */
function precioDePlanilla(precio: number): string {
  return Number(precio).toFixed(2);
}

export function filasDelCatalogo(
  productos: ReadonlyArray<ProductoExportable>,
): string[][] {
  return [
    [...TITULOS],
    ...productos.map((producto) => [
      producto.nombre,
      precioDePlanilla(producto.precio),
      producto.descripcion ?? "",
      producto.categoria ?? "",
      /* Vacío y no «0» cuando el negocio no lleva existencias: un cero dice que
         no queda nada, que es lo contrario de «no se cuenta». */
      producto.controla_stock ? String(producto.cantidad_stock ?? 0) : "",
      producto.codigo,
      producto.subcategoria ?? "",
      producto.visible ? "Sí" : "No",
    ]),
  ];
}

/* El nombre del archivo que el dueño ve en su carpeta de descargas.
 *
 * Lleva la fecha porque va a exportar más de una vez —antes de cambiar de rubro,
 * antes de tocar precios en lote— y tres archivos llamados igual en la misma
 * carpeta no se distinguen sin abrirlos. */
export function nombreDeArchivo(slug: string, fecha = new Date()): string {
  const dia = fecha.toISOString().slice(0, 10);
  const limpio = slug.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "catalogo";
  return `catalogo-${limpio}-${dia}.xlsx`;
}

export function exportarCatalogo(productos: ReadonlyArray<ProductoExportable>): Uint8Array {
  return armarXlsx(filasDelCatalogo(productos), "Catálogo");
}
