import { describe, expect, it } from "vitest";

import {
  armarEnlace,
  destinoEnElCatalogo,
  enlaceDelCartel,
  leerDestino,
  mensajeDePromocion,
  type ContextoDestino,
} from "./destino-banner";

const CONTEXTO: ContextoDestino = {
  urlCatalogo: "https://mi-puesto.com/ferreteria-el-sol",
  telefonoWhatsapp: "71234567",
  ubicacionUrl: "https://maps.google.com/?q=el-sol",
  categorias: [
    { id: "cat-1", nombre: "Pinturas" },
    { id: "cat-2", nombre: "Tornillería" },
  ],
  productos: [{ codigo: "PRD-AB12CD34", nombre: "Pintura látex 4 L" }],
};
const SITIO = "https://mi-puesto.com";

describe("a dónde lleva un banner", () => {
  it("arma el enlace de cada destino conocido", () => {
    expect(armarEnlace({ tipo: "ninguno" }, CONTEXTO)).toBeNull();
    /* Por el filtro del catálogo y no por un ancla: el ancla no existe si la
       categoría no está en la primera página, y el botón no llevaba a nada. */
    expect(armarEnlace({ tipo: "categoria", categoriaId: "cat-1" }, CONTEXTO)).toBe(
      "https://mi-puesto.com/ferreteria-el-sol?categoria=cat-1#productos",
    );
    expect(armarEnlace({ tipo: "producto", codigo: "PRD-AB12CD34" }, CONTEXTO)).toBe(
      "https://mi-puesto.com/ferreteria-el-sol/p/PRD-AB12CD34",
    );
    /* El teléfono se normaliza con el mismo código que el resto del sistema: un
       número de ocho dígitos marca bien desde Bolivia y falla desde afuera. */
    expect(armarEnlace({ tipo: "whatsapp" }, CONTEXTO)).toBe("https://wa.me/59171234567");
    expect(armarEnlace({ tipo: "ubicacion" }, CONTEXTO)).toBe(CONTEXTO.ubicacionUrl);
    expect(armarEnlace({ tipo: "otra", url: " https://ejemplo.com " }, CONTEXTO)).toBe(
      "https://ejemplo.com",
    );
  });

  /* Un banner que no lleva a ninguna parte es un aviso, y el catálogo ya sabe
     dibujarlo: no se toca. Devolver una dirección vacía dejaría un objetivo
     táctil enorme que no hace nada. */
  it("no inventa un enlace cuando falta el dato", () => {
    expect(armarEnlace({ tipo: "ubicacion" }, { ...CONTEXTO, ubicacionUrl: null })).toBeNull();
    expect(armarEnlace({ tipo: "otra", url: "   " }, CONTEXTO)).toBeNull();
  });

  /* Sin el camino de vuelta, abrir un banner que lleva a una categoría mostraría
     «otra dirección» con una URL larga, y al guardar sin tocar nada quedaría
     marcado como dirección externa para siempre. */
  it("reconoce el destino de una dirección ya guardada", () => {
    expect(leerDestino(null, CONTEXTO)).toEqual({ tipo: "ninguno" });
    expect(leerDestino("", CONTEXTO)).toEqual({ tipo: "ninguno" });
    expect(
      leerDestino("https://mi-puesto.com/ferreteria-el-sol?categoria=cat-2#productos", CONTEXTO),
    ).toEqual({ tipo: "categoria", categoriaId: "cat-2" });
    /* El formato viejo, de los banners guardados antes del 2026-10-13. */
    expect(
      leerDestino("https://mi-puesto.com/ferreteria-el-sol#categoria-cat-2", CONTEXTO),
    ).toEqual({ tipo: "categoria", categoriaId: "cat-2" });
    expect(
      leerDestino("https://mi-puesto.com/ferreteria-el-sol/p/PRD-AB12CD34", CONTEXTO),
    ).toEqual({ tipo: "producto", codigo: "PRD-AB12CD34" });
    /* Un producto que ya no está se ve como lo que es: una dirección suelta. */
    expect(
      leerDestino("https://mi-puesto.com/ferreteria-el-sol/p/PRD-BORRADO", CONTEXTO),
    ).toEqual({ tipo: "otra", url: "https://mi-puesto.com/ferreteria-el-sol/p/PRD-BORRADO" });
    expect(leerDestino("https://wa.me/59171234567", CONTEXTO)).toEqual({ tipo: "whatsapp" });
    expect(leerDestino(CONTEXTO.ubicacionUrl, CONTEXTO)).toEqual({ tipo: "ubicacion" });
    expect(leerDestino("https://otra-cosa.com", CONTEXTO)).toEqual({
      tipo: "otra",
      url: "https://otra-cosa.com",
    });
  });

  /* Si el dueño borró la categoría, el ancla quedó muerta. Mostrarla como «una
     categoría» sería señalar una que ya no está en la lista. */
  it("degrada a dirección suelta el ancla de una categoría borrada", () => {
    expect(
      leerDestino("https://mi-puesto.com/ferreteria-el-sol#categoria-borrada", CONTEXTO),
    ).toEqual({
      tipo: "otra",
      url: "https://mi-puesto.com/ferreteria-el-sol#categoria-borrada",
    });
  });

  /* La ida y la vuelta tienen que cerrar: lo que se arma se reconoce. Sin esto,
     guardar y reabrir cambiaría el destino elegido sin que nadie lo tocara. */
  it("cierra el circuito para todos los destinos", () => {
    for (const destino of [
      { tipo: "ninguno" } as const,
      { tipo: "productos" } as const,
      { tipo: "categoria", categoriaId: "cat-1" } as const,
      { tipo: "producto", codigo: "PRD-AB12CD34" } as const,
      { tipo: "whatsapp" } as const,
      { tipo: "ubicacion" } as const,
      { tipo: "otra", url: "https://ejemplo.com" } as const,
    ]) {
      expect(leerDestino(armarEnlace(destino, CONTEXTO), CONTEXTO)).toEqual(destino);
    }
  });
});

/* Lo que se queda en el catálogo se sigue en la misma pestaña, con la
   dirección relativa; lo de afuera no se toca. */
describe("destinoEnElCatalogo", () => {
  it("devuelve la dirección relativa de los destinos que se quedan en el catálogo", () => {
    const ir = (destino: Parameters<typeof armarEnlace>[0]) =>
      destinoEnElCatalogo(armarEnlace(destino, CONTEXTO), SITIO);
    expect(ir({ tipo: "productos" })).toBe("#productos");
    expect(ir({ tipo: "categoria", categoriaId: "cat-1" })).toBe(
      "/ferreteria-el-sol?categoria=cat-1#productos",
    );
    expect(ir({ tipo: "producto", codigo: "PRD-AB12CD34" })).toBe("/ferreteria-el-sol/p/PRD-AB12CD34");
  });

  /* Los banners guardados con el ancla vieja también llevan bien, sin que el
     dueño tenga que volver a guardarlos. */
  it("lleva el ancla vieja de una categoría al filtro", () => {
    expect(destinoEnElCatalogo("https://mi-puesto.com/ferreteria-el-sol#categoria-cat-2", SITIO)).toBe(
      "/ferreteria-el-sol?categoria=cat-2#productos",
    );
  });

  it("no toma por propio un enlace que sale del catálogo", () => {
    expect(destinoEnElCatalogo(null, SITIO)).toBeNull();
    expect(destinoEnElCatalogo("https://wa.me/59171234567", SITIO)).toBeNull();
    expect(destinoEnElCatalogo("https://ejemplo.com/#productos", SITIO)).toBeNull();
    /* La misma forma en otro dominio no es nuestra. */
    expect(destinoEnElCatalogo("https://ejemplo.com/tienda/p/PRD-1", SITIO)).toBeNull();
  });
});

/* El WhatsApp de un banner lleva qué promoción vio el cliente: antes abría una
   conversación en blanco y el negocio no sabía por qué le escribían. */
describe("el WhatsApp de una promoción", () => {
  const textoDe = (enlace: string | null) =>
    decodeURIComponent((enlace ?? "").split("text=")[1]?.replaceAll("+", " ") ?? "");

  it("lleva el título de la promoción", () => {
    const enlace = enlaceDelCartel({ enlace: "https://wa.me/59171234567", titulo: "2x1 en pinturas" });
    expect(enlace?.aparte).toBe(true);
    expect(enlace?.href.startsWith("https://wa.me/59171234567?text=")).toBe(true);
    expect(textoDe(enlace?.href ?? null)).toBe(mensajeDePromocion({ titulo: "2x1 en pinturas" }));
    expect(textoDe(enlace?.href ?? null)).toContain("«2x1 en pinturas»");
  });

  it("sin título usa el antetítulo, y sin nada pide información igual", () => {
    expect(mensajeDePromocion({ eyebrow: "Solo este mes" })).toContain("«Solo este mes»");
    expect(mensajeDePromocion({})).toBe("Hola, vi un anuncio en tu catálogo. ¿Me das más información?");
  });

  it("respeta un enlace de WhatsApp que ya trae su mensaje", () => {
    const propio = "https://wa.me/59171234567?text=Hola";
    expect(enlaceDelCartel({ enlace: propio, titulo: "Promo" })?.href).toBe(propio);
  });
});
