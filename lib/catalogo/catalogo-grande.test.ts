import { describe, expect, it } from "vitest";

import { PLAN_PRUEBA, PLANES, PRODUCTOS_MAXIMOS_EN_PLANES, cargaPara } from "../planes";
import { PRECIOS_DE_CARGA, enlaceCargaPorNosotros, enlaceCatalogoAMedida, pasoSiguiente } from "./catalogo-grande";

const leer = (enlace: string) => decodeURIComponent(enlace.split("text=")[1]);

describe("el paso siguiente de quien no entra en su plan", () => {
  it("si entra, no se le propone nada", () => {
    expect(pasoSiguiente("catalogo", 150)).toBeNull();
    expect(pasoSiguiente("prueba", PLAN_PRUEBA.topes.productos)).toBeNull();
  });

  it("de la prueba, al plan más chico donde entra todo", () => {
    expect(pasoSiguiente("prueba", 127)?.accion).toBe("Pasar al plan Catálogo");
    expect(pasoSiguiente("prueba", 220)?.accion).toBe("Pasar al plan Catálogo Activo");
  });

  it("del Catálogo al Activo, con la cantidad en el mensaje", () => {
    const paso = pasoSiguiente("catalogo", 220);
    expect(paso?.texto).toBe("Con el plan Catálogo Activo entran 300.");
    expect(leer(paso?.enlace ?? "")).toContain("220 productos");
  });

  it("más que el plan más grande es una conversación, sin precio publicado", () => {
    for (const plan of ["prueba", "catalogo", "activo"]) {
      const paso = pasoSiguiente(plan, PRODUCTOS_MAXIMOS_EN_PLANES + 1);
      expect(paso?.accion).toBe("Hablar de mi catálogo");
      expect(paso?.texto).toContain("a medida");
      expect(paso?.texto).not.toContain("Bs");
    }
    expect(leer(pasoSiguiente("activo", 1000)?.enlace ?? "")).toContain("1000 productos");
  });
});

describe("la carga por nosotros", () => {
  it("cobra según la cantidad, y más de 300 no tiene precio", () => {
    expect(cargaPara(127)?.precioBs).toBe(250);
    expect(cargaPara(150)?.precioBs).toBe(250);
    expect(cargaPara(151)?.precioBs).toBe(300);
    expect(cargaPara(300)?.precioBs).toBe(300);
    expect(cargaPara(301)).toBeNull();
  });

  it("dice los dos precios, con las fotos incluidas", () => {
    expect(PRECIOS_DE_CARGA).toBe("Bs 250 hasta 150 productos y Bs 300 hasta 300, con sus fotos.");
  });

  it("el plan más grande y la carga más grande son el mismo número", () => {
    expect(Math.max(...PLANES.map(({ topes }) => topes.productos))).toBe(PRODUCTOS_MAXIMOS_EN_PLANES);
    expect(cargaPara(PRODUCTOS_MAXIMOS_EN_PLANES)).not.toBeNull();
  });

  it("los mensajes llevan la cantidad solo si se sabe", () => {
    expect(leer(enlaceCargaPorNosotros(127))).toContain("unos 127 productos");
    expect(leer(enlaceCargaPorNosotros())).not.toContain("productos");
    expect(leer(enlaceCatalogoAMedida(1000))).toContain("unos 1000 productos");
  });
});
