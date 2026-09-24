import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FORMAS_TARJETA } from "../../lib/apariencia";
import { TEXTOS_DE_PRESENTACION, TIPOS_PRESENTACION } from "../../lib/catalogo/variantes";
import type { TipoNegocio } from "../../lib/negocios/validacion";
import { crearDatosDemoPlantilla } from "../../lib/plantillas/datos-demo";
import type { DatosPlantilla, ProductoPlantilla } from "../../lib/plantillas/tipos";
import { PlantillaMipuesto } from "../templates/mipuesto/plantilla-mipuesto";
import { FichaProducto } from "./ficha-producto";

/* Fase 13: los productos con presentaciones, dibujados.
 *
 * Son combinaciones que nadie va a abrir a mano —cuatro tipos, tres
 * modalidades, tres formas de tarjeta— y la regla que se cuida es una: **un
 * producto con presentaciones no se agrega sin elegir una**. Si una forma de
 * tarjeta o una modalidad volviera a mostrar «agregar» directo, el pedido
 * saldría sin talla, que es el error que la fase vino a cerrar.
 *
 * Se comprueba qué se dibuja, no cómo se ve: eso se valida a mano. */

const MODALIDADES: ReadonlyArray<{ tipo: TipoNegocio; accion: "solo_lectura" | "accion_individual" | "carrito" }> = [
  { tipo: "catalogo_estatico", accion: "solo_lectura" },
  { tipo: "catalogo_cta", accion: "accion_individual" },
  { tipo: "tienda_virtual", accion: "carrito" },
];

const CALZADO = {
  tipoPresentacion: "numero" as const,
  variantes: [
    { id: "v38", nombre: "38", precio: 250, disponibles: 0, accionWhatsapp: "https://wa.me/59170000000?text=38" },
    { id: "v40", nombre: "40", precio: 280, disponibles: 2, accionWhatsapp: "https://wa.me/59170000000?text=40" },
    { id: "v41", nombre: "41", precio: 280, disponibles: 9, accionWhatsapp: "https://wa.me/59170000000?text=41" },
  ],
};

/* El primer producto de la muestra, convertido en una zapatilla con números. */
function conPresentaciones(tipoNegocio: TipoNegocio, forma: (typeof FORMAS_TARJETA)[number]) {
  const datos: DatosPlantilla = crearDatosDemoPlantilla({
    nombre: "Negocio de prueba",
    descripcion: null,
    telefonoWhatsapp: "70000000",
    tipoNegocio,
    formaTarjeta: forma,
  });
  const primera = datos.categorias.find((categoria) => categoria.productos.length > 0)!;
  const zapatilla: ProductoPlantilla = { ...primera.productos[0], nombre: "Zapatilla Runner", vendeTiempo: false, ...CALZADO };
  primera.productos = [zapatilla, ...primera.productos.slice(1)];
  return { datos, zapatilla };
}

describe("la tarjeta de un producto con presentaciones", () => {
  for (const { tipo, accion } of MODALIDADES) {
    for (const forma of FORMAS_TARJETA) {
      it(`${tipo}, ${forma}: no se agrega directo, lleva a elegir`, () => {
        const { datos } = conPresentaciones(tipo, forma);
        const html = renderToString(jsx(PlantillaMipuesto, { datos, demostracion: false }));
        const tarjeta = html.slice(html.indexOf("Zapatilla Runner"));
        const cuerpo = tarjeta.slice(0, tarjeta.indexOf("</li>"));

        if (accion === "solo_lectura") {
          expect(cuerpo).toContain('aria-label="Ver Zapatilla Runner"');
        } else {
          expect(cuerpo).toContain('aria-label="Elegir número de Zapatilla Runner"');
          expect(cuerpo).not.toMatch(/aria-label="[^"]*(Agregar|Pedir)[^"]*Zapatilla Runner/);
        }
        /* Los números cuestan distinto: el precio de la tarjeta es «desde» el menor. */
        expect(cuerpo).toContain("Desde");
        expect(cuerpo).toMatch(/250/);
      });
    }
  }
});

describe("la página de un producto con presentaciones", () => {
  function ficha(
    accion: "solo_lectura" | "accion_individual" | "carrito",
    tipo: (typeof TIPOS_PRESENTACION)[number] = CALZADO.tipoPresentacion,
  ) {
    const { zapatilla } = conPresentaciones("tienda_virtual", "cuadricula");
    /* React separa las partes de una frase con `<!-- -->`; se quitan para
       comparar el texto como lo lee una persona. */
    return renderToString(
      jsx(FichaProducto, {
        producto: { ...zapatilla, tipoPresentacion: tipo },
        modalidad: accion,
        permiteAcciones: true,
        slug: "negocio-de-prueba",
      }),
    ).replaceAll("<!-- -->", "");
  }

  for (const tipo of TIPOS_PRESENTACION) {
    it(`pregunta según el tipo: ${tipo}`, () => {
      expect(ficha("carrito", tipo)).toContain(TEXTOS_DE_PRESENTACION[tipo].elegir);
    });
  }

  for (const { accion } of MODALIDADES.filter(({ accion }) => accion !== "solo_lectura")) {
    it(`${accion}: sin elegir no hay botón para agregar, y se dice qué falta`, () => {
      const html = ficha(accion);
      expect(html).toContain(
        accion === "carrito" ? "Elegí tu número para agregarlo al pedido." : "Elegí tu número para pedirlo.",
      );
      expect(html).not.toMatch(/aria-label="[^"]*(Agregar|Pedir)[^"]*Zapatilla/);
    });
  }

  it("la agotada se ve, dice «Agotado» y no se puede elegir; la que tiene pocas lo dice", () => {
    const html = ficha("carrito");
    const opcion38 = html.slice(html.indexOf('value="v38"') - 200, html.indexOf('value="v38"') + 200);
    expect(opcion38).toMatch(/disabled=""/);
    expect(html).toContain("Agotado");
    expect(html).toContain("Quedan 2");
    /* Nada viene elegido: ningún radio marcado. */
    expect(html).not.toMatch(/name="presentacion"[^>]*checked/);
  });
});
