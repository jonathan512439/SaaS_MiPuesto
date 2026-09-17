import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CATALOGO = join(import.meta.dirname, "catalogo-interactivo.tsx");

/* Lo que el catálogo dibuja y lo que el catálogo deja pedir son lo mismo.
 *
 * Eran dos: la plantilla recibía el catálogo con las tandas que llegaron al
 * bajar, y la lista de productos que se podían agregar se armaba con la primera
 * tanda nada más. Los productos que aparecían al desplazar se veían, se tocaban
 * y no pasaba nada: `cambiarCantidad` los buscaba, no los encontraba y se volvía
 * en silencio. Sin error, sin aviso, sin nada — el botón del carrito
 * simplemente no respondía.
 *
 * Costó que el dueño lo encontrara probando producto por producto. La regla que
 * lo evita es de una línea: los dos salen del mismo objeto.
 */
describe("el catálogo interactivo", () => {
  it("dibuja y deja pedir el mismo catálogo", () => {
    const fuente = readFileSync(CATALOGO, "utf8");

    const dibujado = /datos=\{([A-Za-z]+)\}/.exec(fuente);
    const pedible = /obtenerProductos\(([A-Za-z]+)\)/.exec(fuente);

    expect(dibujado?.[1], "la plantilla tiene que recibir una variable, no un objeto armado ahí")
      .toBeDefined();
    expect(pedible?.[1], "la lista de lo que se puede pedir tiene que salir de una variable")
      .toBeDefined();
    expect(pedible?.[1], "lo que se ve y lo que se puede pedir salen del mismo objeto").toBe(
      dibujado?.[1],
    );
  });
});
