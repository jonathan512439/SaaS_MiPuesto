import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ProveedorAvisos } from "../ui";
import { ResultadoDeCreacion, RevisionDeProductos, type ProductoLeido } from "./revision-de-productos";

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

function dibujar(
  controlaStock: boolean,
  nombresDelCatalogo: string[] = [],
  plan: { planId: string; productosActuales: number } = { planId: "catalogo", productosActuales: 0 },
) {
  return renderToString(
    jsx(ProveedorAvisos, {
      children: jsx(RevisionDeProductos, {
        categorias: [],
        controlaStock,
        introduccion: "Prueba",
        nombresDelCatalogo,
        onTerminado: () => undefined,
        productos: [POLERA, ZAPATILLA],
        ...plan,
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

  /* El tope del plan, antes de crear: con 149 de 150 en el plan Catálogo entra
     uno de los dos marcados. La base rechazaría el segundo igual, pero a mitad
     de la importación y sin explicar por qué. */
  it("avisa cuando lo marcado no entra en el plan, y no deja crear de más", () => {
    const lleno = dibujar(false, [], { planId: "catalogo", productosActuales: 149 });
    expect(lleno).toContain("Tu plan Catálogo incluye hasta 150 productos y ya tienes 149: entran 1 más.");
    expect(lleno).toContain("Desmarca 1 para poder crear los demás.");
    expect(lleno).toMatch(/<button[^>]*disabled=""[^>]*>(?:(?!<\/button>).)*Crear 2 producto/);

    const holgado = dibujar(false, [], { planId: "activo", productosActuales: 149 });
    expect(holgado).not.toContain("para poder crear los demás");
    expect(holgado).toContain("Agregar fotos (hasta 4)");
    expect(dibujar(false)).toContain("Agregar fotos (hasta 3)");
  });
});

/* Lo que queda en pantalla al terminar de crear. Los productos ya están a la
   vista de los clientes: el texto no puede decir «antes de publicarlo», y el
   paso siguiente natural —ver cómo quedó— tiene que estar a un toque. */
describe("el resultado de crear", () => {
  const RESULTADO = { creados: 8, fotos: 0, fallidos: [], fotosFallidas: 0, advertencias: [] };

  it("dice que ya están publicados y lleva al catálogo", () => {
    const html = renderToString(
      jsx(ResultadoDeCreacion, { resultado: RESULTADO, enlaceCatalogo: "/kallpa-zapatillas" }),
    ).replaceAll("<!-- -->", "");
    expect(html).toContain("8 producto(s) creado(s)");
    expect(html).toContain("Ya están publicados en tu catálogo");
    expect(html).not.toContain("antes de publicarlo");
    expect(html).toContain('href="/kallpa-zapatillas"');
    expect(html).toContain("Ver mi catálogo");
  });

  it("sin enlace, no dibuja uno roto", () => {
    const html = renderToString(jsx(ResultadoDeCreacion, { resultado: RESULTADO }));
    expect(html).not.toContain("Ver mi catálogo");
  });
});

/* Una categoría nueva nace con sus campos: la casilla dice cuáles, y solo
   aparece si la sección se crea. A una categoría que ya existe no se le tocan. */
describe("los campos de una categoría nueva", () => {
  const MOCHILA: ProductoLeido = {
    nombre: "Mochila escolar azul",
    precio: 150,
    descripcion: "",
    categoria: "Mochilas escolares",
    confianza: "alta",
    campos: { Color: "Azul", "Capacidad (litros)": "20", Costo: "90" },
  };

  function dibujarMochila(categorias: Array<{ id: string; nombre: string }>) {
    return renderToString(
      jsx(ProveedorAvisos, {
        children: jsx(RevisionDeProductos, {
          categorias: categorias as never,
          controlaStock: false,
          introduccion: "Prueba",
          onTerminado: () => undefined,
          productos: [MOCHILA],
          planId: "catalogo",
          productosActuales: 0,
        }),
      }),
    ).replaceAll("<!-- -->", "");
  }

  it("dice con qué campos se crea, sin las columnas internas", () => {
    const html = dibujarMochila([]);
    expect(html).toContain("Con sus campos: Color, Capacidad (litros)");
    expect(html).not.toContain("Costo");
  });

  it("si la sección va a una categoría que ya existe, no ofrece campos", () => {
    const html = dibujarMochila([{ id: "c1", nombre: "Mochilas escolares" }]);
    expect(html).not.toContain("Con sus campos");
  });
});

/* La descripción que escribió la IA se dice con palabras, y el botón para
   escribir las que faltan solo aparece si el negocio tiene la IA. */
describe("las descripciones que escribe la IA", () => {
  const SUGERIDA: ProductoLeido = {
    nombre: "Mochila de viaje",
    precio: 320,
    descripcion: "Mochila de viaje negra de 40 litros.",
    descripcionSugerida: true,
    categoria: "",
    confianza: "alta",
  };
  const SIN_DESCRIPCION: ProductoLeido = { ...SUGERIDA, nombre: "Lonchera", descripcion: "", descripcionSugerida: false };

  function dibujarCon(describirConIa: boolean) {
    return renderToString(
      jsx(ProveedorAvisos, {
        children: jsx(RevisionDeProductos, {
          categorias: [],
          controlaStock: false,
          describirConIa,
          introduccion: "Prueba",
          onTerminado: () => undefined,
          productos: [SUGERIDA, SIN_DESCRIPCION],
          planId: "catalogo",
          productosActuales: 0,
        }),
      }),
    ).replaceAll("<!-- -->", "");
  }

  it("marca la sugerida y lo dice arriba", () => {
    const html = dibujarCon(false);
    expect(html).toContain("Descripción sugerida");
    expect(html).toContain('aria-label="Descripción sugerida"');
    expect(html).toContain("1 descripción la escribió la IA");
  });

  it("ofrece escribir las que faltan solo con la IA habilitada", () => {
    expect(dibujarCon(true)).toContain("Escribir una descripción corta donde falte");
    expect(dibujarCon(true)).toContain("A 1 producto le falta descripción");
    expect(dibujarCon(false)).not.toContain("Escribir una descripción corta donde falte");
  });
});

/* El botón de las descripciones gasta una lectura: el contador va pegado a él,
   y en la prueba no habla de meses (2026-10-24). */
describe("las descripciones con IA dicen cuántas lecturas quedan", () => {
  function conIa(lecturas?: { quedan: number; total: number; prueba: boolean }) {
    return renderToString(
      jsx(ProveedorAvisos, {
        children: jsx(RevisionDeProductos, {
          categorias: [],
          controlaStock: false,
          describirConIa: true,
          introduccion: "Prueba",
          lecturas,
          onTerminado: () => undefined,
          planId: "catalogo",
          productos: [POLERA],
          productosActuales: 0,
        }),
      }),
    ).replaceAll("<!-- -->", "");
  }

  it("al lado del botón, con lo que queda del mes", () => {
    const html = conIa({ quedan: 7, total: 10, prueba: false });
    expect(html).toContain("Escribir una descripción corta donde falte");
    expect(html).toMatch(/Te quedan <strong>7<\/strong> de 10\s*lecturas con IA este mes/);
  });

  it("en la prueba, sin meses; en cero, qué pasa después", () => {
    const html = conIa({ quedan: 0, total: 5, prueba: true });
    expect(html).toContain("lecturas con IA de tu prueba");
    expect(html).toContain("Al elegir tu plan, tienes más cada mes.");
  });

  it("sin cupo pasado, no inventa un número", () => {
    expect(conIa()).not.toContain("Te quedan");
  });
});
