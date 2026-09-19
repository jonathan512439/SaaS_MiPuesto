import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/* La regla global que hunde los campos no puede ganarle a la paleta.
 *
 * `app/globals.css` pinta todo `input`, `textarea` y `select` con el fondo del
 * panel para que «un campo se hunda». Dentro de un catálogo con paleta oscura
 * eso es un fondo blanco debajo de una letra clara: la búsqueda, el nombre y el
 * celular del pedido no se leían. La causa fue la especificidad: cuatro
 * `:not([type])` valen cuatro atributos y le ganan a cualquier `.clase input`.
 *
 * La regla tiene que vivir dentro de `:where()`, que la deja en cero y cumple
 * lo que su propio comentario promete: cualquier hoja le gana sin pelear. */
describe("los campos del catálogo llevan su paleta", () => {
  const globales = readFileSync(join(import.meta.dirname, "../../app/globals.css"), "utf8");

  it("la regla global de los campos no tiene especificidad", () => {
    /* El selector es lo que hay entre la última llave (o el último comentario)
       y la llave que abre la regla. */
    const regla = globales.match(/([^{}]*input:not\(\[type="checkbox"\]\)[^{]*)\{/)?.[1] ?? "";
    expect(regla, "falta la regla global de los campos").not.toBe("");
    const selector = regla.split("*/").at(-1)!.trim();
    expect(selector.startsWith(":where(")).toBe(true);
  });

  it("el tema del catálogo pinta sus controles con la paleta", () => {
    const tema = readFileSync(join(import.meta.dirname, "tema-catalogo.module.css"), "utf8");
    const bloque = tema.match(/\.tema input,[\s\S]*?\{([^}]*)\}/)?.[1] ?? "";
    expect(bloque).toContain("background-color: var(--catalogo-superficie)");
  });
});
