import { readFileSync } from "node:fs";
import { join } from "node:path";

import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ContextoDestino } from "../../lib/negocios/destino-banner";
import { armarVistaPrevia } from "../../lib/plantillas/vista-previa-del-negocio";
import { FormularioPortada } from "../negocios/formulario-portada";
import { ProveedorAvisos } from "../ui";
import { FormularioBanners } from "./formulario-banners";

/* La portada en Apariencia y el banner en Promociones.
 *
 * Eran un solo formulario y el dueño no distinguía una cosa de la otra: se
 * separaron el 2026-10-13. Son dos pantallas grandes del panel, donde un error
 * que no ve TypeScript la deja en blanco, así que se comprueba que se dibujan y
 * con qué. */

const DESTINOS: ContextoDestino = {
  urlCatalogo: "https://mi-puesto.com/negocio-prueba",
  telefonoWhatsapp: "71234567",
  ubicacionUrl: null,
  categorias: [{ id: "cat-1", nombre: "Collares" }],
  productos: [{ codigo: "PRD-AB12CD34", nombre: "Collar de cuero" }],
};

const conAvisos = (hijo: ReturnType<typeof jsx>) =>
  renderToString(jsx(ProveedorAvisos, { children: hijo })).replaceAll("<!-- -->", "");

describe("el texto de la portada, en Apariencia", () => {
  it("se dibuja con sus campos y avisa cuando falta la foto", () => {
    const html = conAvisos(
      jsx(FormularioPortada, {
        destinos: DESTINOS,
        portadaInicial: { eyebrow: null, titulo: "Pollo crocante", copy: null, boton: null, enlace: null },
        tienePortada: false,
      }),
    );
    expect(html).toContain("Texto sobre tu portada");
    expect(html).toContain("Pollo crocante");
    expect(html).toContain("Todavía no subiste una foto de portada:");
    expect(html).toContain("Frase corta arriba del título");
    /* Una frase y no dos párrafos (2026-10-22): no vuelve a explicar qué es
       la portada ni dónde se cambia, que está justo arriba. */
    expect(html).not.toContain("La portada es la foto grande");
    expect(html).not.toContain("banner-imagen-0");
  });
});

/* Desde el 2026-10-21 son dos, cada uno en su bloque con su nombre: el
   superior primero, como en el catálogo, aunque se guarde en el lugar 1. */
describe("los dos banners, en Promociones", () => {
  const banner = (alt: string, titulo: string, imagen: string) => ({
    imagen,
    alt,
    eyebrow: null,
    titulo,
    copy: null,
    boton: "Quiero el mío",
    enlace: "https://wa.me/59171234567",
  });
  const vista = armarVistaPrevia(
    {
      slug: "negocio-prueba",
      nombre: "Negocio de prueba",
      descripcion: null,
      telefono_whatsapp: "71234567",
      tipo_negocio: "tienda_virtual",
      paleta_id: "mercado",
      rubro: null,
      patron_fondo: true,
      patron_opacidad: null,
      subnombre: null,
      banners: [
        banner("Aviso del feriado", "Cerramos el lunes", "neg/banner/inferior.webp"),
        banner("Collares con descuento", "20 % en collares", "neg/banner/superior.webp"),
      ],
      logo_url: null,
      portada_url: null,
      portada_texto: null,
      forma_tarjeta: null,
    },
    "https://prueba.supabase.co",
  );

  it("se dibujan en dos bloques con su nombre, el superior primero", () => {
    const html = conAvisos(jsx(FormularioBanners, { destinos: DESTINOS, vista }));
    const superior = html.indexOf("Banner superior</legend>");
    const inferior = html.indexOf("Banner inferior</legend>");
    expect(superior).toBeGreaterThan(-1);
    expect(inferior).toBeGreaterThan(superior);
    expect(html).toContain("Debajo de las categorías, arriba de tus primeros productos.");
    expect(html).toContain("A la mitad del catálogo, entre dos categorías.");
    /* Cada bloque con lo que tiene guardado su lugar, no el del otro. */
    expect(html.indexOf('value="Collares con descuento"')).toBeGreaterThan(superior);
    expect(html.indexOf('value="Collares con descuento"')).toBeLessThan(inferior);
    expect(html.indexOf('value="Aviso del feriado"')).toBeGreaterThan(inferior);
    for (const paso of ["1 · La imagen", "2 · ¿Qué muestra la imagen?", "3 · Texto encima y botón", "4 · Así se ve"]) {
      expect(html).toContain(paso);
    }
    expect(html).toContain('id="banner-imagen-superior"');
    expect(html).toContain('id="banner-imagen-inferior"');
    expect(html).toContain('href="https://wa.me/59171234567?text=');
    expect(html).toContain("A un producto de mi catálogo");
  });

  it("llevan al costado el catálogo entero con los dos banners", () => {
    const html = conAvisos(jsx(FormularioBanners, { destinos: DESTINOS, vista }));
    expect(html).toContain("Así se ve tu catálogo");
    expect(html).toContain("Dónde va cada banner en tu catálogo");
    /* Cada texto sale dos veces: en la muestra chica de su bloque y en el
       catálogo entero. */
    expect(html.split("20 % en collares").length - 1).toBeGreaterThanOrEqual(2);
    expect(html.split("Cerramos el lunes").length - 1).toBeGreaterThanOrEqual(2);
  });
});

/* Lo más delicado del cambio: cada formulario guarda solo lo suyo. Antes, un
   banner que no llegaba se tomaba como lista vacía, y guardar solo la portada
   habría borrado el banner. */
describe("la ruta que los guarda", () => {
  const ruta = readFileSync(join(import.meta.dirname, "..", "..", "app/api/negocios/banners/route.ts"), "utf8");
  it("toca los banners solo si llegan", () => {
    expect(ruta).toContain('const tocaBanners = "banners" in cuerpo;');
    expect(ruta).toContain("...(tocaBanners ? { banners: validacion.banners } : {}),");
    expect(ruta).not.toMatch(/\.update\(\{\s*banners: validacion\.banners,/);
  });
});
