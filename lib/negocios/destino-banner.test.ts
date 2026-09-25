import { describe, expect, it } from "vitest";

import { anclaDelCatalogo, armarEnlace, leerDestino, type ContextoDestino } from "./destino-banner";

const CONTEXTO: ContextoDestino = {
  urlCatalogo: "https://mi-puesto.com/ferreteria-el-sol",
  telefonoWhatsapp: "71234567",
  ubicacionUrl: "https://maps.google.com/?q=el-sol",
  categorias: [
    { id: "cat-1", nombre: "Pinturas" },
    { id: "cat-2", nombre: "Tornillería" },
  ],
};

describe("a dónde lleva un banner", () => {
  it("arma el enlace de cada destino conocido", () => {
    expect(armarEnlace({ tipo: "ninguno" }, CONTEXTO)).toBeNull();
    expect(armarEnlace({ tipo: "categoria", categoriaId: "cat-1" }, CONTEXTO)).toBe(
      "https://mi-puesto.com/ferreteria-el-sol#categoria-cat-1",
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
      leerDestino("https://mi-puesto.com/ferreteria-el-sol#categoria-cat-2", CONTEXTO),
    ).toEqual({ tipo: "categoria", categoriaId: "cat-2" });
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
      { tipo: "whatsapp" } as const,
      { tipo: "ubicacion" } as const,
      { tipo: "otra", url: "https://ejemplo.com" } as const,
    ]) {
      expect(leerDestino(armarEnlace(destino, CONTEXTO), CONTEXTO)).toEqual(destino);
    }
  });
});

/* Un destino dentro del catálogo se dibuja con su ancla sola: así el navegador
   baja en la misma página en vez de abrir otra pestaña del mismo catálogo. */
describe("anclaDelCatalogo", () => {
  it("devuelve el ancla de los destinos que se quedan en el catálogo", () => {
    expect(anclaDelCatalogo(armarEnlace({ tipo: "productos" }, CONTEXTO))).toBe("#productos");
    expect(anclaDelCatalogo(armarEnlace({ tipo: "categoria", categoriaId: "cat-1" }, CONTEXTO))).toBe(
      "#categoria-cat-1",
    );
  });

  it("no toma por ancla un enlace que sale del catálogo", () => {
    expect(anclaDelCatalogo(null)).toBeNull();
    expect(anclaDelCatalogo("https://wa.me/59171234567")).toBeNull();
    expect(anclaDelCatalogo("https://ejemplo.com/#seccion")).toBeNull();
  });
});
