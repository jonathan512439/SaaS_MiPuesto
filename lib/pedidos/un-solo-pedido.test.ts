import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = join(import.meta.dirname, "..", "..");

/* El único que puede tocar el almacén del pedido. */
const DUENIO = join("lib", "pedidos", "use-pedido.ts");

/* Y el archivo que define ese almacén, obviamente. */
const ALMACEN = join("lib", "pedidos", "pedido-guardado.ts");

const CARPETAS = ["app", "components", "lib"];
const EXTENSIONES = [".ts", ".tsx"];

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) return archivos(ruta);
    if (!EXTENSIONES.includes(extname(entrada.name))) return [];
    return [ruta];
  });
}

/* El pedido en curso tiene un solo dueño.
 *
 * El cliente lo arma en dos pantallas: agrega desde la tarjeta del catálogo y
 * también desde la página del producto, adonde lleva tocar esa tarjeta. Las dos
 * escriben el mismo `sessionStorage`.
 *
 * Con dos copias de la lógica, el mismo pedido terminaría diciendo dos cosas:
 * alcanza con que una recorte al máximo disponible y la otra no, o con que una
 * guarde el producto entero y la otra solo su identificador. Eso no es una
 * hipótesis —es la forma en que este proyecto se rompió antes, con dos
 * constructores del producto y dos buscadores— así que acá queda anotado.
 *
 * Quien necesite el pedido usa `usePedido`. Si de verdad hace falta leer o
 * escribir el almacén desde otro lado, primero hay que borrar esta prueba, y
 * entonces la pregunta se hace en voz alta. */
describe("el pedido en curso", () => {
  it("se lee y se escribe desde un solo lugar", () => {
    const intrusos = CARPETAS.flatMap((carpeta) => archivos(join(RAIZ, carpeta)))
      .map((ruta) => relative(RAIZ, ruta))
      .filter((ruta) => ruta !== DUENIO && ruta !== ALMACEN && !ruta.endsWith(".test.ts"))
      .filter((ruta) => {
        const fuente = readFileSync(join(RAIZ, ruta), "utf8");
        return fuente.includes("guardarPedido") || fuente.includes("leerPedidoGuardado");
      });

    expect(intrusos, `el pedido se maneja con usePedido, no a mano`).toEqual([]);
  });
});
