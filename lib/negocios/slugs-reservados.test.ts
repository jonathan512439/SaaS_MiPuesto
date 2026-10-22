import { readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SLUGS_RESERVADOS } from "./validacion";

/* Una ruta estática le gana al catálogo `/[slug]`: un negocio que se llamara
 * como una carpeta de `app/` pagaba, cargaba su catálogo y su dirección abría
 * otra página. Pasó tres veces —«plataforma», «terminos», «privacidad»— y una
 * cuarta sin que nadie lo notara: «alta». Esta prueba lee las carpetas en vez de
 * confiar en que alguien se acuerde. */

const APP = join(import.meta.dirname, "..", "..", "app");

/* Las carpetas que se vuelven el primer tramo de una dirección: se entra en los
   grupos `(…)`, que no suman tramo, y se saltan las dinámicas `[…]` y las
   privadas `_…`. */
function primerosTramos(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .flatMap((entrada) => {
      if (entrada.name.startsWith("(")) return primerosTramos(join(carpeta, entrada.name));
      if (entrada.name.startsWith("[") || entrada.name.startsWith("_")) return [];
      return [entrada.name];
    });
}

describe("los nombres reservados", () => {
  it("incluyen cada ruta estática de la aplicación", () => {
    const tramos = primerosTramos(APP);
    expect(tramos).toContain("empezar");
    for (const tramo of tramos) {
      expect(SLUGS_RESERVADOS.has(tramo), `«${tramo}» es una ruta y no está reservado`).toBe(true);
    }
  });
});
