import { describe, expect, it } from "vitest";

import { GRUPOS_ICONOS, TRAZOS_CATALOGO } from "../components/iconos/catalogo";
import { MAXIMO_ICONOS_PATRON, iconosDePatron } from "./patrones-fondo";

/* Vacío no es un detalle: es la señal de que hay que poner el dibujo por rubro.
   Si esta función devolviera algo para un negocio sin categorías, el catálogo
   dibujaría el fondo propio y el contenedor el de rubro, los dos a la vez. */
describe("iconosDePatron", () => {
  it("empieza por los de las categorías, sin repetidos, intercalados con los agregados", () => {
    const iconos = iconosDePatron([{ icono: "perro" }, { icono: "hueso" }, { icono: "perro" }]);
    expect(iconos[0]).toBe("perro");
    expect(iconos[2]).toBe("hueso");
    expect(new Set(iconos).size).toBe(iconos.length);
  });

  /* Pedido por el dueño el 2026-10-14: con dos o tres categorías el fondo eran
     dos o tres dibujos repetidos. */
  it("da el doble de los propios, nunca menos de ocho", () => {
    expect(iconosDePatron([{ icono: "perro" }, { icono: "hueso" }])).toHaveLength(8);
    const seis = ["perro", "hueso", "gato", "ave", "pez", "jeringa"].map((icono) => ({ icono }));
    expect(iconosDePatron(seis)).toHaveLength(12);
  });

  it("completa con el juego de los propios antes que con otros", () => {
    const veterinaria = GRUPOS_ICONOS.find(({ id }) => id === "veterinaria")!.iconos as ReadonlyArray<string>;
    const iconos = iconosDePatron([{ icono: "perro" }, { icono: "gato" }], "otro");
    expect(iconos.every((icono) => veterinaria.includes(icono))).toBe(true);
  });

  it("si el juego no alcanza, sigue con el del rubro y los generales", () => {
    const ropa = ["remera", "calzado", "reloj", "lentes", "joya", "corona", "bolso", "mochila"].map((icono) => ({ icono }));
    const iconos = iconosDePatron(ropa, "ropa_y_calzado");
    expect(iconos).toHaveLength(MAXIMO_ICONOS_PATRON);
    expect(new Set(iconos).size).toBe(MAXIMO_ICONOS_PATRON);
  });

  it("solo devuelve íconos que el catálogo sabe dibujar, salvo los que vienen de la base", () => {
    const iconos = iconosDePatron([{ icono: "pizza" }], "restaurante");
    expect(iconos.every((icono) => icono in TRAZOS_CATALOGO)).toBe(true);
  });

  it("no pasa del tope que la baldosa sabe dibujar", () => {
    const muchas = Array.from({ length: 30 }, (_, i) => ({ icono: `icono-${i}` }));
    expect(iconosDePatron(muchas)).toHaveLength(MAXIMO_ICONOS_PATRON);
  });

  it("devuelve vacío cuando no hay categorías con ícono", () => {
    expect(iconosDePatron([])).toEqual([]);
    expect(iconosDePatron([{ icono: null }, { icono: "  " }, {}], "restaurante")).toEqual([]);
  });
});
