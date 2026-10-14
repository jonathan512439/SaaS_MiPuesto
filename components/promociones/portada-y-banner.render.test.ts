import { readFileSync } from "node:fs";
import { join } from "node:path";

import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ContextoDestino } from "../../lib/negocios/destino-banner";
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
  it("se dibuja solo con la portada, y manda el banner a Promociones", () => {
    const html = conAvisos(
      jsx(FormularioPortada, {
        destinos: DESTINOS,
        portadaInicial: { eyebrow: null, titulo: "Pollo crocante", copy: null, boton: null, enlace: null },
        tienePortada: false,
      }),
    );
    expect(html).toContain("Texto sobre tu portada");
    expect(html).toContain("Pollo crocante");
    expect(html).toContain("Todavía no subiste una foto de portada.");
    expect(html).toContain("Frase corta arriba del título");
    expect(html).toContain('href="/dashboard/promociones"');
    expect(html).not.toContain("banner-imagen-0");
  });
});

describe("el banner, en Promociones", () => {
  it("se dibuja en cuatro pasos con su vista previa", () => {
    const html = conAvisos(
      jsx(FormularioBanners, {
        bannersIniciales: [
          {
            imagen: "neg/banner/a.webp",
            alt: "Collares con descuento",
            eyebrow: null,
            titulo: "20 % en collares",
            copy: null,
            boton: "Quiero el mío",
            enlace: "https://wa.me/59171234567",
          },
        ],
        destinos: DESTINOS,
        paleta: "mercado",
        urlPorRuta: { "neg/banner/a.webp": "https://prueba.supabase.co/a.webp" },
      }),
    );
    for (const paso of ["1 · La imagen", "2 · ¿Qué muestra la imagen?", "3 · Texto encima y botón", "4 · Así se ve en tu catálogo"]) {
      expect(html).toContain(paso);
    }
    expect(html).toContain('value="Collares con descuento"');
    /* La vista previa es el banner de verdad, con el mensaje de la promoción. */
    expect(html).toContain("20 % en collares");
    expect(html).toMatch(/href="https:\/\/wa\.me\/59171234567\?text=/);
    expect(html).toContain("A un producto de mi catálogo");
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
