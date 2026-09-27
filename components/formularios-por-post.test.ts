import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/* Todo formulario declara `method="post"`.
 *
 * Los formularios del proyecto se envían con JavaScript (`onSubmit` y
 * `preventDefault`). Pero si alguien toca «Ingresar» antes de que la página
 * termine de cargar —un celular con internet lento—, el navegador lo envía por
 * su cuenta, y sin `method` lo hace por GET: **los campos quedan en la
 * dirección**. Pasó el 2026-09-27 probando el alta en local: el ingreso terminó
 * en `/login?correo=…&clave=…`, con la contraseña en el historial, en los
 * registros del servidor y de Cloudflare, y en cualquier captura. Con `post`,
 * lo que viaja va en el cuerpo, nunca en la dirección.
 *
 * Mira `app/` y `components/`: el formulario de ingreso, el de la contraseña
 * nueva, el del segundo factor y el del pedido del carrito —con el nombre y el
 * celular del cliente— son los que más importan, pero la regla vale para todos
 * para que el próximo no dependa de acordarse.
 *
 * La excepción es a propósito: el buscador y los filtros del directorio van por
 * GET, porque los filtros viven en la dirección (AGENTS.md) y una búsqueda se
 * comparte con su enlace. Solo llevan palabras de búsqueda, nunca datos de
 * nadie. Ningún otro formulario puede ir por GET. */
const BUSCADORES_POR_GET = new Set([
  "components/directorio/buscador-vivo.tsx",
  "components/directorio/filtros-directorio.tsx",
]);
const RAIZ = join(import.meta.dirname, "..");

function archivosTsx(directorio: string): string[] {
  return readdirSync(directorio).flatMap((nombre) => {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) return archivosTsx(ruta);
    return nombre.endsWith(".tsx") && !nombre.includes(".test.") ? [ruta] : [];
  });
}

/* La etiqueta de apertura completa, que puede ocupar varias líneas. */
function aperturasDeFormulario(codigo: string): string[] {
  return [...codigo.matchAll(/<form\b[^>]*>/g)].map(([etiqueta]) => etiqueta);
}

describe("formularios", () => {
  it("todos declaran method=\"post\", para que un envío antes de cargar no deje los datos en la dirección", () => {
    const sinPost = ["app", "components"]
      .flatMap((carpeta) => archivosTsx(join(RAIZ, carpeta)))
      .flatMap((archivo) => {
        const ruta = relative(RAIZ, archivo).replaceAll("\\", "/");
        return aperturasDeFormulario(readFileSync(archivo, "utf8"))
          .filter((etiqueta) => {
            if (/\bmethod="post"/.test(etiqueta)) return false;
            return !(BUSCADORES_POR_GET.has(ruta) && /\bmethod="get"/.test(etiqueta));
          })
          .map(() => ruta);
      });
    expect(sinPost).toEqual([]);
  });
});
