import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ProveedorAvisos } from "../ui";
import { RevisionDeProductos, type ProductoLeido } from "./revision-de-productos";

/* La revisión de una planilla con tallas y datos de categoría, dibujada.
 *
 * Es una combinación que nadie abre a mano —una planilla de ropa con tallas,
 * un número mal escrito, con y sin control de existencias—, y la regla que se
 * cuida es que el dueño vea **antes de crear** las tallas de cada producto y
 * lo que está raro. Se comprueba qué se dibuja; el aspecto se valida a mano. */

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => undefined }) }));

const POLERA: ProductoLeido = {
  nombre: "Polera básica blanca",
  precio: 70,
  descripcion: "",
  categoria: "Ropa de dama",
  confianza: "alta",
  cantidad: 13,
  tipoPresentacion: "talla",
  presentaciones: [
    { nombre: "S", precio: null, cantidad: 4 },
    { nombre: "M", precio: null, cantidad: 6 },
    { nombre: "XL", precio: 80, cantidad: 3 },
  ],
  campos: { Color: "Blanco" },
  avisos: [],
};

const ZAPATILLA: ProductoLeido = {
  nombre: "Zapatilla urbana",
  precio: 280,
  descripcion: "",
  categoria: "Calzado",
  confianza: "alta",
  cantidad: null,
  tipoPresentacion: "numero",
  presentaciones: [{ nombre: "treinta", precio: null, cantidad: null }],
  campos: {},
  avisos: ["«treinta» no es un número de calzado: van de 16 a 50, enteros o con medio."],
};

function dibujar(controlaStock: boolean, nombresDelCatalogo: string[] = []) {
  return renderToString(
    jsx(ProveedorAvisos, {
      children: jsx(RevisionDeProductos, {
        categorias: [],
        controlaStock,
        introduccion: "Prueba",
        nombresDelCatalogo,
        onTerminado: () => undefined,
        productos: [POLERA, ZAPATILLA],
      }),
    }),
  ).replaceAll("<!-- -->", "");
}

describe("la revisión de una planilla con tallas", () => {
  it("cada producto muestra sus tallas, cuántas hay y el precio de la que cuesta distinto", () => {
    const html = dibujar(true);
    expect(html).toContain("Talla S (4) · Talla M (6) · Talla XL (3) · Bs 80");
  });

  it("sin control de existencias no se dicen las cantidades", () => {
    const html = dibujar(false);
    expect(html).toContain("Talla S · Talla M · Talla XL · Bs 80");
  });

  it("con tallas no se pide la cantidad del producto: es la de cada talla", () => {
    const html = dibujar(true);
    const polera = html.slice(html.indexOf("Polera básica blanca"), html.indexOf("Zapatilla urbana"));
    expect(polera).not.toContain(">Cantidad<");
  });

  it("lo raro se dice antes de crear", () => {
    expect(dibujar(true)).toContain("«treinta» no es un número de calzado");
  });
});

describe("una importación que se cortó y se vuelve a subir", () => {
  it("lo que ya está en el catálogo viene sin marcar, con la etiqueta y el aviso", () => {
    const html = dibujar(true, ["polera basica blanca"]);
    const casilla = (nombre: string) =>
      html.match(new RegExp(`<input[^>]*aria-label="Incluir ${nombre}"[^>]*>`))?.[0] ?? "";
    expect(casilla("Polera básica blanca")).toMatch(/type="checkbox"/);
    expect(casilla("Polera básica blanca")).not.toContain("checked");
    expect(html).toContain("Ya está en tu catálogo");
    expect(html).toContain("1 producto ya está en tu catálogo con el mismo nombre");
    /* El que no existe sigue marcado. */
    expect(casilla("Zapatilla urbana")).toContain("checked");
  });

  it("sin coincidencias no hay aviso", () => {
    expect(dibujar(true)).not.toContain("Ya está en tu catálogo");
  });
});
