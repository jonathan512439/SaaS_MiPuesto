import { describe, expect, it } from "vitest";

import { construirUrlVistaPrevia } from "./vista-previa-compartida";

const URL_SUPABASE = "https://proyecto.supabase.co";

describe("construirUrlVistaPrevia", () => {
  it("apunta al transformador y no al objeto crudo", () => {
    const url = construirUrlVistaPrevia(URL_SUPABASE, "productos", "negocio/foto.webp");
    expect(url).toContain("/storage/v1/render/image/public/productos/");
    expect(url).not.toContain("/object/public/");
  });

  it("pide un ancho acotado para no traer la foto entera", () => {
    const url = construirUrlVistaPrevia(URL_SUPABASE, "productos", "a/b.webp");
    expect(url).toContain("width=800");
    expect(url).toContain("quality=72");
  });

  it("escapa cada segmento de la ruta", () => {
    const url = construirUrlVistaPrevia(URL_SUPABASE, "negocios", "mi negocio/la foto.webp");
    expect(url).toContain("mi%20negocio/la%20foto.webp");
  });

  it("tolera una barra final en la url del proyecto", () => {
    const url = construirUrlVistaPrevia(`${URL_SUPABASE}/`, "productos", "a.webp");
    expect(url).not.toContain(".co//storage");
  });

  it("devuelve nulo si no hay ruta", () => {
    expect(construirUrlVistaPrevia(URL_SUPABASE, "productos", null)).toBeNull();
  });

  it("respeta una dirección absoluta ya guardada", () => {
    const externa = "https://otro.sitio/foto.jpg";
    expect(construirUrlVistaPrevia(URL_SUPABASE, "negocios", externa)).toBe(externa);
  });
});
