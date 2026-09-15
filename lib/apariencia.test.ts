import { describe, expect, it } from "vitest";

import { DEFINICIONES_PALETAS, PALETAS } from "./apariencia";

/* Lo que queda del registro de apariencia después de la poda de la fase 6.
 *
 * Antes eran tres ejes —plantilla × tarjeta × paleta— y este archivo vigilaba
 * las veintiocho combinaciones, qué tarjeta admitía cada plantilla y la
 * corrección de una forma imposible. Nada de eso existe: el diseño es uno solo
 * y el único eje es el color.
 *
 * Que la lista de paletas coincida con la restricción de la base y con el CSS
 * del tema lo comprueba `scripts/check-design-contrast.mjs`, que además mide el
 * contraste de cada una. Acá quedan las dos cosas que ese control no mira. */
describe("registro de paletas", () => {
  it("define una descripción por cada paleta, en el mismo orden", () => {
    expect(DEFINICIONES_PALETAS.map(({ id }) => id)).toEqual([...PALETAS]);
  });

  it("no repite identificadores", () => {
    expect(new Set(PALETAS).size).toBe(PALETAS.length);
  });

  /* Un nombre vacío deja una opción sin rótulo en el panel: se puede elegir,
     pero no se sabe qué se está eligiendo. */
  it("ninguna queda sin nombre ni sin descripción", () => {
    for (const { id, nombre, descripcion } of DEFINICIONES_PALETAS) {
      expect(nombre.trim(), `la paleta ${id} no tiene nombre`).not.toBe("");
      expect(descripcion.trim(), `la paleta ${id} no tiene descripción`).not.toBe("");
    }
  });
});
