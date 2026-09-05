import { describe, expect, it } from "vitest";

import {
  ANCHO_LOGO,
  ANCHO_PORTADA,
  obtenerUrlPublicaImagenNegocio,
} from "./imagenes-publicas";

const URL_SUPABASE = "https://proyecto.supabase.co";

describe("imágenes públicas del negocio", () => {
  it("pide la portada al ancho que ocupa y no el archivo entero", () => {
    const url = obtenerUrlPublicaImagenNegocio(URL_SUPABASE, "n1/portada/a.webp", "portada");
    expect(url).toContain("/storage/v1/render/image/public/negocios/");
    expect(url).toContain(`width=${ANCHO_PORTADA}`);
  });

  it("pide el logotipo mucho más chico que la portada", () => {
    const url = obtenerUrlPublicaImagenNegocio(URL_SUPABASE, "n1/logo/a.webp", "logo");
    expect(url).toContain(`width=${ANCHO_LOGO}`);
    expect(ANCHO_LOGO).toBeLessThan(ANCHO_PORTADA);
  });

  /* El panel muestra lo que el dueño subió: ahí no se reduce. */
  it("devuelve el archivo tal cual cuando no se pide un rol", () => {
    const url = obtenerUrlPublicaImagenNegocio(URL_SUPABASE, "n1/logo/a.webp");
    expect(url).toBe(`${URL_SUPABASE}/storage/v1/object/public/negocios/n1/logo/a.webp`);
  });

  it("escapa los segmentos de la ruta", () => {
    const url = obtenerUrlPublicaImagenNegocio(URL_SUPABASE, "n 1/logo/a b.webp", "logo");
    expect(url).toContain("n%201/logo/a%20b.webp");
  });

  it("no toca una dirección que ya es absoluta", () => {
    expect(obtenerUrlPublicaImagenNegocio(URL_SUPABASE, "https://otro/x.webp", "portada")).toBe(
      "https://otro/x.webp",
    );
  });

  it("devuelve nulo sin ruta", () => {
    expect(obtenerUrlPublicaImagenNegocio(URL_SUPABASE, null, "portada")).toBeNull();
  });
});
