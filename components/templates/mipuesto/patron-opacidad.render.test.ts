import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { crearDatosDemoPlantilla } from "../../../lib/plantillas/datos-demo";
import { PlantillaMipuesto } from "./plantilla-mipuesto";

/* La intensidad del fondo la lleva la propia plantilla.
 *
 * `.tema` declara la intensidad de reserva (6 %), y la plantilla también es
 * `.tema`: si la intensidad elegida quedaba solo en el contenedor de afuera, la
 * plantilla la tapaba con la suya. La barra «Cuánto se nota» de Apariencia no
 * hacía nada, ni en la vista previa ni en el catálogo, hasta el 2026-10-13. */

function raiz(patronFondo: boolean, patronOpacidad: number) {
  const base = crearDatosDemoPlantilla({
    nombre: "Negocio de prueba",
    descripcion: null,
    telefonoWhatsapp: "70000000",
    tipoNegocio: "catalogo_estatico",
  });
  const datos = { ...base, negocio: { ...base.negocio, patronFondo, patronOpacidad } };
  const html = renderToString(jsx(PlantillaMipuesto, { datos, demostracion: true }));
  return html.slice(0, html.indexOf(">") + 1);
}

describe("la intensidad del fondo", () => {
  it("va en el mismo elemento que declara la de reserva", () => {
    const etiqueta = raiz(true, 21);
    expect(etiqueta).toMatch(/^<article\b/);
    expect(etiqueta).toMatch(/class="[^"]*_tema_/);
    expect(etiqueta).toContain('data-patron-opacidad="21"');
  });

  it("sin fondo no declara intensidad", () => {
    expect(raiz(false, 21)).not.toContain("data-patron-opacidad");
  });
});
