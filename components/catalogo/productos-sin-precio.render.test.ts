import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FORMAS_TARJETA, type FormaTarjeta } from "../../lib/apariencia";
import { construirCatalogoPublico } from "../../lib/catalogo/publico";
import type { TipoNegocio } from "../../lib/negocios/validacion";
import type { ProductoPlantilla } from "../../lib/plantillas/tipos";
import { PlantillaMipuesto } from "../templates/mipuesto/plantilla-mipuesto";
import { FichaProducto } from "./ficha-producto";
import { ProductoConPedido } from "./producto-con-pedido";

/* Fase 14: un producto sin precio, dibujado (`docs/plan/11-PRODUCTOS-SIN-PRECIO.md`).
 *
 * La regla que se cuida es la que el dueño pidió con sus palabras: «no quiero
 * que mencione que no tiene precio por ningún lado en el catálogo que ve el
 * cliente final». Son combinaciones que nadie abre a mano —tres modalidades,
 * tres formas de tarjeta, la ficha y la página— y un «Bs 0» o un «Precio a
 * consultar» en una sola de ellas es justamente lo que el dueño no quiere.
 *
 * Se mira **el HTML entero** de cada pieza, no solo el texto visible: una
 * etiqueta para lectores de pantalla, un `alt` o una clase con «precio» también
 * cuentan. Y se exige lo contrario: que la única acción sea «Consultar por
 * WhatsApp».
 *
 * Los datos pasan por `construirCatalogoPublico`, que es el camino de verdad:
 * así se prueba también que la fila de la base con `precio: null` llega a la
 * plantilla sin precio. */

const MODALIDADES: ReadonlyArray<{
  tipo: TipoNegocio;
  accion: "solo_lectura" | "accion_individual" | "carrito";
}> = [
  { tipo: "catalogo_estatico", accion: "solo_lectura" },
  { tipo: "catalogo_cta", accion: "accion_individual" },
  { tipo: "tienda_virtual", accion: "carrito" },
];

/* Lo que no puede aparecer en ninguna pieza de un producto sin precio. «Bs»
   con mayúscula y como palabra: es como se escribe el precio. */
const PROHIBIDO = [/precio/i, /\bBs\b/, /a consultar/i, /cotiz/i, /\bBs\.?\s*0\b/];

/* Ni comprar ni agendar: la única acción es consultar. */
const OTRAS_ACCIONES = [/Agregar/, /Pedir/, /Agendar/, /Elige tu/, /Oferta/, /Desde/];

const SIN_PRECIO = {
  nulo: "Placa 1P horizontal 4x2",
  cero: "Interruptor doble",
  conTallas: "Remera lisa",
  servicio: "Instalación eléctrica",
};
const CON_PRECIO = "Foco LED 9 W";

function armarCatalogo(tipoNegocio: TipoNegocio, forma: FormaTarjeta = "cuadricula") {
  const fila = (id: string, nombre: string, precio: number | null, categoria = "cat-ferreteria") => ({
    id,
    codigo: `PRD-${id.toUpperCase()}`,
    categoria_id: categoria,
    subcategoria_id: null,
    nombre,
    descripcion: "Para la casa y la obra.",
    precio,
    fotos: [],
    estado: "disponible",
    controla_stock: false,
    cantidad_stock: null,
    cantidad_reservada: 0,
    visible: true,
    orden: 0,
  });

  return construirCatalogoPublico(
    {
      id: "negocio-1",
      slug: "ferrovolt",
      nombre: "Ferrovolt",
      descripcion: null,
      telefono_whatsapp: "70000000",
      tipo_negocio: tipoNegocio,
      horario: null,
      paleta_id: "mercado",
      forma_tarjeta: forma,
    },
    [
      { id: "cat-ferreteria", nombre: "Ferretería", orden: 0 },
      { id: "cat-servicios", nombre: "Servicios", orden: 1, vende: "tiempo" },
    ],
    [],
    [
      fila("a", SIN_PRECIO.nulo, null),
      fila("b", SIN_PRECIO.cero, 0),
      { ...fila("c", SIN_PRECIO.conTallas, null), con_presentaciones: true, tipo_presentacion: "talla" },
      fila("d", SIN_PRECIO.servicio, null, "cat-servicios"),
      fila("e", CON_PRECIO, 25),
    ],
    "https://proyecto.supabase.co",
    new Date("2026-11-18T15:00:00Z"),
    /* Una promoción sobre el producto sin precio: no puede encender «Oferta». */
    [
      {
        activo: true,
        categoria_id: null,
        fecha_fin: null,
        fecha_inicio: null,
        producto_id: "a",
        tipo: "porcentaje",
        valor: 10,
      },
    ],
    [],
    /* Decisión 4: tallas con precio propio y sin precio base. Se consulta. */
    [
      { id: "v-m", producto_id: "c", nombre: "M", precio: 40, cantidad_stock: null, visible: true, orden: 0 },
      { id: "v-l", producto_id: "c", nombre: "L", precio: null, cantidad_stock: null, visible: true, orden: 1 },
    ],
  );
}

function productoDe(datos: ReturnType<typeof armarCatalogo>["datos"], nombre: string): ProductoPlantilla {
  const producto = datos.categorias
    .flatMap((categoria) => categoria.productos)
    .find((item) => item.nombre === nombre);
  if (!producto) throw new Error(`No se armó ${nombre}.`);
  return producto;
}

/* La tarjeta de un producto, del `<li` que la abre al `</li>` que la cierra. */
function tarjetaDe(html: string, nombre: string): string {
  const posicion = html.indexOf(`>${nombre}<`);
  if (posicion < 0) throw new Error(`No se dibujó la tarjeta de ${nombre}.`);
  const inicio = html.lastIndexOf("<li ", posicion);
  return html.slice(inicio, html.indexOf("</li>", posicion) + "</li>".length);
}

function noMencionaElPrecio(html: string, donde: string) {
  for (const patron of PROHIBIDO) {
    expect(html, `${donde} dice ${patron}`).not.toMatch(patron);
  }
}

function soloConsulta(html: string, donde: string) {
  expect(html, `${donde} no ofrece consultar`).toContain("Consultar por WhatsApp");
  for (const patron of OTRAS_ACCIONES) {
    expect(html, `${donde} ofrece ${patron}`).not.toMatch(patron);
  }
}

describe("la tarjeta de un producto sin precio", () => {
  for (const { tipo } of MODALIDADES) {
    for (const forma of FORMAS_TARJETA) {
      it(`${tipo}, ${forma}: sin precio, sin decirlo, y con «Consultar por WhatsApp»`, () => {
        const { datos } = armarCatalogo(tipo, forma);
        const html = renderToString(jsx(PlantillaMipuesto, { datos, demostracion: false }));
        for (const nombre of Object.values(SIN_PRECIO)) {
          const tarjeta = tarjetaDe(html, nombre);
          noMencionaElPrecio(tarjeta, `${nombre} (${tipo}, ${forma})`);
          soloConsulta(tarjeta, `${nombre} (${tipo}, ${forma})`);
        }
      });
    }

    /* La otra mitad: el que tiene precio lo sigue mostrando. Sin esto, la
       prueba pasaría con un catálogo que no muestra ningún precio. */
    it(`${tipo}: el producto con precio sigue diciendo cuánto cuesta`, () => {
      const { datos } = armarCatalogo(tipo);
      const html = renderToString(jsx(PlantillaMipuesto, { datos, demostracion: false }));
      const tarjeta = tarjetaDe(html, CON_PRECIO);
      expect(tarjeta).toContain("Bs 25");
      expect(tarjeta).not.toContain("Consultar por WhatsApp");
    });
  }
});

describe("la ficha y la página de un producto sin precio", () => {
  for (const { tipo, accion } of MODALIDADES) {
    for (const nombre of Object.values(SIN_PRECIO)) {
      it(`${tipo}, ${nombre}: la ficha no lo menciona y solo consulta`, () => {
        const { datos } = armarCatalogo(tipo);
        const producto = productoDe(datos, nombre);
        const html = renderToString(
          jsx(FichaProducto, { producto, modalidad: accion, permiteAcciones: true, slug: "ferrovolt" }),
        );
        noMencionaElPrecio(html, `la ficha de ${nombre} (${tipo})`);
        soloConsulta(html, `la ficha de ${nombre} (${tipo})`);
        /* El enlace abre WhatsApp con el mensaje de consulta. */
        expect(html).toMatch(/href="https:\/\/wa\.me\/59170000000\?text=Hola%2C\+quiero\+consultar/);
      });

      it(`${tipo}, ${nombre}: la página tampoco`, () => {
        const { datos } = armarCatalogo(tipo);
        const producto = productoDe(datos, nombre);
        const html = renderToString(
          jsx(ProductoConPedido, {
            negocioId: "negocio-1",
            producto,
            modalidad: accion,
            permiteAcciones: true,
            slug: "ferrovolt",
          }),
        );
        noMencionaElPrecio(html, `la página de ${nombre} (${tipo})`);
        soloConsulta(html, `la página de ${nombre} (${tipo})`);
      });
    }

    it(`${tipo}: la ficha del producto con precio sigue mostrándolo`, () => {
      const { datos } = armarCatalogo(tipo);
      const html = renderToString(
        jsx(FichaProducto, {
          producto: productoDe(datos, CON_PRECIO),
          modalidad: accion,
          permiteAcciones: true,
          slug: "ferrovolt",
        }),
      );
      expect(html).toContain("Bs 25");
      expect(html).not.toContain("Consultar por WhatsApp");
    });
  }
});

describe("el mensaje de la consulta", () => {
  it("lleva el nombre y el enlace al producto, y no habla de precio", () => {
    const { datos } = armarCatalogo("tienda_virtual");
    const enlace = productoDe(datos, SIN_PRECIO.nulo).consultaWhatsapp;
    expect(enlace).not.toBeNull();
    const mensaje = new URL(enlace!).searchParams.get("text") ?? "";
    expect(mensaje).toContain("quiero consultar por este producto de Ferrovolt: Placa 1P horizontal 4x2.");
    expect(mensaje).toContain("/ferrovolt/p/PRD-A");
    noMencionaElPrecio(mensaje, "el mensaje");
  });

  it("un producto con precio no trae enlace de consulta", () => {
    const { datos } = armarCatalogo("catalogo_cta");
    expect(productoDe(datos, CON_PRECIO).consultaWhatsapp).toBeNull();
  });
});

/* La vista previa del panel (Apariencia, Promociones) dibuja con
   `demostracion`: el botón se ve y no abre nada. Sin precio, igual que en el
   catálogo. */
describe("la vista previa del panel", () => {
  it("dibuja la tarjeta sin precio igual que el catálogo, con el botón apagado", () => {
    const { datos } = armarCatalogo("tienda_virtual");
    const html = renderToString(jsx(PlantillaMipuesto, { datos, demostracion: true }));
    const tarjeta = tarjetaDe(html, SIN_PRECIO.nulo);
    noMencionaElPrecio(tarjeta, "la vista previa");
    soloConsulta(tarjeta, "la vista previa");
    expect(tarjeta).not.toContain("wa.me");
  });
});
