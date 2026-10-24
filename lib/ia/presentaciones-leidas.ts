import type { PresentacionDePlanilla } from "../importacion/planilla";
import { LARGO_NOMBRE_VARIANTE, MAXIMO_VARIANTES, type TipoPresentacion } from "../catalogo/variantes";

/* Las tallas, números y tamaños que la lectura con IA encontró en un renglón.
 *
 * Antes, «Pique macho grande/chico 60/35» daba dos productos, y una mochila en
 * chica, mediana y grande daba tres: el catálogo quedaba con tres tarjetas casi
 * iguales y el cliente comparaba tarjetas en vez de elegir un tamaño. Ahora el
 * modelo devuelve un solo producto con sus presentaciones, y esto las deja como
 * las deja la planilla de Excel: la pantalla de revisión y la ruta de variantes
 * son las mismas para las dos.
 *
 * Lo que devuelve el modelo no se cree tal cual: nombres vacíos o repetidos,
 * precios que no son precios y más presentaciones de las que la base acepta se
 * corrigen o se descartan acá, antes de que el dueño los vea. */

/* Lo que el esquema le deja contestar al modelo. «opcion» y no «presentacion»
   porque es la palabra que usa la planilla («Se elige por: Opción»), y
   «ninguna» para el renglón que es un solo producto. */
export const SE_ELIGE_POR_LEIDO = ["talla", "numero", "tamano", "opcion", "ninguna"] as const;

const TIPO_POR_LEIDO: Record<string, TipoPresentacion> = {
  talla: "talla",
  numero: "numero",
  tamano: "tamano",
  opcion: "presentacion",
};

export type PresentacionesDelRenglon = {
  /* El precio del producto: el que el renglón trae, o el de la primera
     presentación si el renglón solo trae los de cada una. */
  precio: number;
  presentaciones: PresentacionDePlanilla[];
  tipoPresentacion: TipoPresentacion | null;
};

function esPrecio(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor) && valor > 0 && valor <= 99_999;
}

export function presentacionesDelRenglon(renglon: {
  precio: unknown;
  se_elige_por?: unknown;
  presentaciones?: unknown;
}): PresentacionesDelRenglon {
  const precioLeido = Number(renglon.precio);
  const sinPresentaciones = { precio: precioLeido, presentaciones: [], tipoPresentacion: null };

  const tipo = TIPO_POR_LEIDO[String(renglon.se_elige_por ?? "")];
  if (!tipo || !Array.isArray(renglon.presentaciones)) return sinPresentaciones;

  const vistas = new Set<string>();
  const leidas: Array<{ nombre: string; precio: number | null }> = [];
  for (const cruda of renglon.presentaciones as Array<{ nombre?: unknown; precio?: unknown }>) {
    const nombre = String(cruda?.nombre ?? "").trim().slice(0, LARGO_NOMBRE_VARIANTE);
    const clave = nombre.toLowerCase();
    if (!nombre || vistas.has(clave)) continue;
    vistas.add(clave);
    const precio = Number(cruda?.precio);
    leidas.push({ nombre, precio: esPrecio(precio) ? precio : null });
    if (leidas.length === MAXIMO_VARIANTES) break;
  }

  /* Una sola no es una elección: queda como el producto que es, con su
     nombre. Se pierde poco —«Talla única»— y no se crea un selector de uno. */
  if (leidas.length < 2) return sinPresentaciones;

  /* El precio del producto es el del renglón si el modelo lo leyó; si no, el
     de la primera presentación, que es el que se ve primero en la lista. */
  const precio = esPrecio(precioLeido) ? precioLeido : (leidas.find((una) => una.precio !== null)?.precio ?? NaN);

  return {
    precio,
    tipoPresentacion: tipo,
    presentaciones: leidas.map(({ nombre, precio: suyo }) => ({
      nombre,
      /* Sin precio propio si cuesta lo mismo que el producto: así sigue al
         producto si el dueño le corrige el precio, y le alcanza una promoción. */
      precio: suyo === null || suyo === precio ? null : suyo,
      /* Ninguna lista dice cuántas quedan de cada talla. */
      cantidad: null,
    })),
  };
}
