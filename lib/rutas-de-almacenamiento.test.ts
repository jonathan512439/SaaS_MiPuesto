import { describe, expect, it } from "vitest";

import { construirUrlVistaPrevia } from "./catalogo/vista-previa-compartida";
import { obtenerUrlPublicaImagenNegocio } from "./negocios/imagenes-publicas";
import { esRutaDeAlmacenamiento } from "./rutas-de-almacenamiento";

const URL_SUPABASE = "https://proyecto.supabase.co";

/* Lo que un dueño puede dejar escrito en `logo_url`, `portada_url`, `banners` o
   `fotos` con su sesión, sin pasar por la ruta que sube la imagen. */
const DE_AFUERA = [
  "https://otro.sitio/foto.jpg",
  "http://169.254.169.254/latest/meta-data",
  "//otro.sitio/foto.jpg",
  "/etc/passwd",
  "javascript:alert(1)",
  "data:image/png;base64,AAAA",
  "negocio/../../../auth/v1/settings",
  "negocio/./foto.webp",
  "negocio\\..\\foto.webp",
  "negocio/foto.webp?width=9999",
  "negocio/foto.webp#x",
  "negocio//foto.webp",
  "",
  "a".repeat(301),
];

describe("las rutas de las imágenes guardadas", () => {
  it("acepta las que genera el sistema", () => {
    for (const ruta of [
      "0b9f6c1e-1c2d-4e3f-8a9b-0c1d2e3f4a5b/logo/7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d.webp",
      "0b9f6c1e-1c2d-4e3f-8a9b-0c1d2e3f4a5b/7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d/foto.webp",
      "mi negocio/la foto.webp",
    ]) {
      expect(esRutaDeAlmacenamiento(ruta), ruta).toBe(true);
    }
  });

  it("rechaza lo que saldría del depósito", () => {
    for (const ruta of DE_AFUERA) expect(esRutaDeAlmacenamiento(ruta), ruta).toBe(false);
    for (const valor of [null, undefined, 7, {}, ["a/b.webp"]]) {
      expect(esRutaDeAlmacenamiento(valor)).toBe(false);
    }
  });

  /* La imagen para compartir pide esta dirección **desde el servidor**. Lo que
     no sea una ruta del depósito no se pide: la tarjeta sale sin foto. */
  it("la imagen para compartir no pide una dirección escrita por el dueño", () => {
    for (const ruta of DE_AFUERA) {
      expect(construirUrlVistaPrevia(URL_SUPABASE, "negocios", ruta), ruta).toBeNull();
      expect(construirUrlVistaPrevia(URL_SUPABASE, "productos", ruta), ruta).toBeNull();
    }
  });

  it("el catálogo no pone en la página una imagen de afuera", () => {
    for (const ruta of DE_AFUERA) {
      for (const rol of ["logo", "portada", "banner", "qr", "original"] as const) {
        expect(obtenerUrlPublicaImagenNegocio(URL_SUPABASE, ruta, rol), `${rol}: ${ruta}`).toBeNull();
      }
    }
  });

  it("lo que sale apunta siempre al depósito del proyecto", () => {
    const ruta = "0b9f6c1e-1c2d-4e3f-8a9b-0c1d2e3f4a5b/portada/7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d.webp";
    expect(construirUrlVistaPrevia(URL_SUPABASE, "negocios", ruta)).toMatch(
      /^https:\/\/proyecto\.supabase\.co\/storage\/v1\/render\/image\/public\/negocios\//,
    );
    expect(obtenerUrlPublicaImagenNegocio(URL_SUPABASE, ruta, "portada")).toMatch(
      /^https:\/\/proyecto\.supabase\.co\/storage\/v1\/render\/image\/public\/negocios\//,
    );
  });
});
