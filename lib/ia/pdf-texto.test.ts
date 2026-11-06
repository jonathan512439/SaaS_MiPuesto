import { describe, expect, it } from "vitest";

import {
  CARACTERES_MAXIMOS,
  CARACTERES_POR_TANDA,
  dividirEnTandas,
  paginaTieneTexto,
  recortarPaginas,
  renglonesDePagina,
  type TrozoDeTexto,
} from "./pdf-texto";

const trozo = (texto: string, x: number, y: number, ancho = texto.length * 5): TrozoDeTexto => ({
  texto,
  x,
  y,
  ancho,
  alto: 10,
});

describe("los renglones de una página", () => {
  it("ordena por posición y no por cómo vienen guardados", () => {
    expect(
      renglonesDePagina([trozo("Refresco", 10, 680), trozo("Bebidas", 10, 700), trozo("Bs 12", 60, 680)]),
    ).toEqual(["Bebidas", "Refresco Bs 12"]);
  });

  it("marca el salto de columna, para que un precio no caiga en el producto de al lado", () => {
    expect(
      renglonesDePagina([
        trozo("Cartera", 300, 700),
        trozo("Mochila", 40, 700),
        trozo("Bs 60", 300, 685),
        trozo("Bs 80", 40, 685),
      ]),
    ).toEqual(["Mochila | Cartera", "Bs 80 | Bs 60"]);
  });

  it("junta en un renglón lo que queda apenas desalineado", () => {
    expect(renglonesDePagina([trozo("Api", 10, 700), trozo("Bs 6", 30, 703)])).toEqual(["Api Bs 6"]);
  });

  it("no separa lo que está pegado ni duplica espacios", () => {
    expect(renglonesDePagina([trozo("Sal", 10, 700, 15), trozo("teña", 25, 700), trozo(" ", 45, 700)])).toEqual([
      "Salteña",
    ]);
  });

  it("una página vacía no tiene renglones", () => {
    expect(renglonesDePagina([])).toEqual([]);
    expect(renglonesDePagina([trozo("   ", 10, 700)])).toEqual([]);
  });
});

describe("qué página trae texto de verdad", () => {
  it("un número de página solo es una página sin texto", () => {
    expect(paginaTieneTexto(["3"])).toBe(false);
    expect(paginaTieneTexto([])).toBe(false);
    expect(paginaTieneTexto(["Mochila escolar", "Bs 80"])).toBe(true);
  });
});

describe("las tandas", () => {
  const renglones = (cantidad: number) =>
    Array.from({ length: cantidad }, (_, i) => `Producto número ${i} ... Bs ${i}`).join("\n");

  it("junta las páginas y dice de qué página viene cada una", () => {
    expect(dividirEnTandas([{ numero: 2, texto: "Api Bs 6" }, { numero: 3, texto: "Té Bs 4" }])).toEqual([
      "--- Página 2 ---\nApi Bs 6\n--- Página 3 ---\nTé Bs 4",
    ]);
  });

  it("no pasa del tope y no corta una página si entra entera en la siguiente", () => {
    const paginas = Array.from({ length: 12 }, (_, i) => ({ numero: i + 1, texto: renglones(50) }));
    const tandas = dividirEnTandas(paginas);
    expect(tandas.length).toBeGreaterThan(1);
    for (const tanda of tandas) expect(tanda.length).toBeLessThanOrEqual(CARACTERES_POR_TANDA);
    expect(tandas.join("\n").match(/--- Página \d+ ---/g)).toHaveLength(12);
    for (const tanda of tandas) expect(tanda.startsWith("--- Página")).toBe(true);
  });

  it("una página enorme se parte por renglones, sin perder ninguno ni cortarlos", () => {
    const tandas = dividirEnTandas([{ numero: 1, texto: renglones(700) }]);
    expect(tandas.length).toBeGreaterThan(1);
    for (const tanda of tandas) expect(tanda.length).toBeLessThanOrEqual(CARACTERES_POR_TANDA);
    const todo = tandas.join("\n");
    expect(todo).toContain("Producto número 0 ... Bs 0");
    expect(todo).toContain("Producto número 699 ... Bs 699");
    expect(todo.split("\n")).toHaveLength(701);
  });

  it("sin páginas no hay tandas", () => {
    expect(dividirEnTandas([])).toEqual([]);
  });
});

describe("lo que entra en una lectura", () => {
  it("corta por caracteres y dice cuántas páginas quedaron afuera", () => {
    const pagina = (numero: number) => ({ numero, texto: "x".repeat(CARACTERES_MAXIMOS / 2 - 1) });
    const { entran, afuera } = recortarPaginas([pagina(1), pagina(2), pagina(3), pagina(4)]);
    expect(entran.map(({ numero }) => numero)).toEqual([1, 2]);
    expect(afuera).toBe(2);
  });

  it("si entra todo, no queda nada afuera", () => {
    expect(recortarPaginas([{ numero: 1, texto: "Api" }]).afuera).toBe(0);
  });
});
