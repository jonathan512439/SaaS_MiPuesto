import { describe, expect, it } from "vitest";

import {
  SIN_TEXTO,
  leerTextoPortada,
  tieneAlgoEncima,
  validarTextoPortada,
} from "./texto-sobre-imagen";

describe("leerTextoPortada", () => {
  it("lee los cinco campos y recorta cada uno a su techo", () => {
    const texto = leerTextoPortada({
      eyebrow: " Solo hoy ",
      titulo: "t".repeat(200),
      copy: "Bajada",
      boton: "Ver",
      enlace: "https://ejemplo.com/promo",
    });
    expect(texto.eyebrow).toBe("Solo hoy");
    expect(texto.titulo).toHaveLength(80);
    expect(texto.copy).toBe("Bajada");
    expect(texto.boton).toBe("Ver");
    expect(texto.enlace).toBe("https://ejemplo.com/promo");
  });

  /* Nunca nulo: una portada sin texto es un valor, y quien dibuja pregunta
     `tieneAlgoEncima`. Así ninguna pantalla tiene que preguntar dos cosas. */
  it("devuelve «sin texto» con lo que no es un objeto", () => {
    expect(leerTextoPortada(null)).toEqual(SIN_TEXTO);
    expect(leerTextoPortada(undefined)).toEqual(SIN_TEXTO);
    expect(leerTextoPortada("hola")).toEqual(SIN_TEXTO);
    expect(leerTextoPortada([{ titulo: "x" }])).toEqual(SIN_TEXTO);
    expect(leerTextoPortada({})).toEqual(SIN_TEXTO);
  });

  it("descarta enlaces que no son https", () => {
    expect(leerTextoPortada({ enlace: "javascript:alert(1)" }).enlace).toBeNull();
    expect(leerTextoPortada({ enlace: "http://ejemplo.com" }).enlace).toBeNull();
  });
});

/* La cortina existe para que la letra se lea, y sin letra no hay cortina. Esta
   es la pregunta de la que depende, así que se fija cuándo dice que sí. */
describe("tieneAlgoEncima", () => {
  it("no hay nada sin texto, ni con un botón que no lleva a ninguna parte", () => {
    expect(tieneAlgoEncima(SIN_TEXTO)).toBe(false);
    expect(tieneAlgoEncima({ ...SIN_TEXTO, boton: "Ver" })).toBe(false);
    expect(tieneAlgoEncima({ ...SIN_TEXTO, enlace: "https://ejemplo.com" })).toBe(false);
  });

  it("hay algo con cualquier texto, o con un botón que sí lleva", () => {
    expect(tieneAlgoEncima({ ...SIN_TEXTO, eyebrow: "Hoy" })).toBe(true);
    expect(tieneAlgoEncima({ ...SIN_TEXTO, titulo: "Promo" })).toBe(true);
    expect(tieneAlgoEncima({ ...SIN_TEXTO, copy: "Bajada" })).toBe(true);
    expect(tieneAlgoEncima({ ...SIN_TEXTO, boton: "Ver", enlace: "https://ejemplo.com" })).toBe(true);
  });
});

describe("validarTextoPortada", () => {
  it("acepta lo vacío, que es lo normal", () => {
    expect(validarTextoPortada(undefined)).toEqual({ correcto: true, texto: SIN_TEXTO });
    expect(validarTextoPortada({})).toEqual({ correcto: true, texto: SIN_TEXTO });
  });

  it("explica que el enlace tiene que ser https, en vez de descartarlo callado", () => {
    const resultado = validarTextoPortada({ boton: "Ver", enlace: "http://ejemplo.com" });
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores["portada.enlace"]).toContain("https://");
  });

  it("rechaza lo que no es un objeto", () => {
    expect(validarTextoPortada([]).correcto).toBe(false);
    expect(validarTextoPortada("x").correcto).toBe(false);
  });
});
