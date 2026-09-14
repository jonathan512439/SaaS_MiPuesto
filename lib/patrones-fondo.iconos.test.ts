import { describe, expect, it } from "vitest";

import { MAXIMO_ICONOS_PATRON, iconosDePatron } from "./patrones-fondo";

/* Vacío no es un detalle: es la señal de que hay que poner el dibujo por rubro.
   Si esta función devolviera algo para un negocio sin categorías, el catálogo
   dibujaría el fondo propio y el contenedor el de rubro, los dos a la vez. */
describe("iconosDePatron", () => {
  it("devuelve los íconos en orden, sin repetidos", () => {
    expect(
      iconosDePatron([{ icono: "tienda" }, { icono: "caja" }, { icono: "tienda" }]),
    ).toEqual(["tienda", "caja"]);
  });

  it("no pasa del tope que la baldosa sabe dibujar", () => {
    const muchas = Array.from({ length: 30 }, (_, i) => ({ icono: `icono-${i}` }));
    expect(iconosDePatron(muchas)).toHaveLength(MAXIMO_ICONOS_PATRON);
  });

  it("devuelve vacío cuando no hay categorías con ícono", () => {
    expect(iconosDePatron([])).toEqual([]);
    expect(iconosDePatron([{ icono: null }, { icono: "  " }, {}])).toEqual([]);
  });
});
