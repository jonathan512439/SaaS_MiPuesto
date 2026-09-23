import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  MAXIMO_VARIANTES,
  TIPOS_PRESENTACION,
  normalizarNombreDePresentacion,
  normalizarNumeroCalzado,
  normalizarTalla,
  nombreConPresentacion,
} from "./variantes";

const RAIZ = join(import.meta.dirname, "..", "..");
const PRUEBA_DE_BASE = readFileSync(
  join(RAIZ, "supabase", "tests", "remote", "fase13-presentaciones.sql"),
  "utf8",
);

/* Los casos viven en la prueba de la base, entre dos marcas, y se leen de ahí:
   así la regla de la aplicación y la de la base se prueban contra la misma
   lista, y agregar un caso lo agrega a las dos. */
function casos(marca: string): Array<[string, string | null]> {
  const inicio = PRUEBA_DE_BASE.indexOf(`-- casos:${marca}:inicio`);
  const fin = PRUEBA_DE_BASE.indexOf(`-- casos:${marca}:fin`);
  if (inicio < 0 || fin < 0) throw new Error(`No están los casos «${marca}» en la prueba de la base.`);
  const bloque = PRUEBA_DE_BASE.slice(inicio, fin);
  return [...bloque.matchAll(/\('((?:[^']|'')*)',\s*(?:'((?:[^']|'')*)'|null)\)/g)].map(
    ([, entrada, esperado]) => [
      entrada.replaceAll("''", "'"),
      esperado === undefined ? null : esperado.replaceAll("''", "'"),
    ],
  );
}

function ultimaMigracionQueDefine(funcion: string): string {
  const carpeta = join(RAIZ, "supabase", "migrations");
  return (
    readdirSync(carpeta)
      .sort()
      .map((archivo) => readFileSync(join(carpeta, archivo), "utf8"))
      .filter((sql) => sql.includes(`function public.${funcion}(`))
      .at(-1) ?? ""
  );
}

describe("el número de calzado, escrito siempre igual", () => {
  const lista = casos("numero");

  it("hay casos suficientes para que la comparación signifique algo", () => {
    expect(lista.length).toBeGreaterThanOrEqual(15);
    expect(lista.some(([, esperado]) => esperado === null)).toBe(true);
  });

  it.each(lista)("«%s» → %s, igual que en la base", (entrada, esperado) => {
    expect(normalizarNumeroCalzado(entrada)).toBe(esperado);
  });

  it("nada de un tipo que no existe", () => {
    expect(normalizarNumeroCalzado(null)).toBeNull();
    expect(normalizarNumeroCalzado(undefined)).toBeNull();
  });
});

describe("la talla, en mayúsculas si es una de las de siempre", () => {
  const lista = casos("talla");

  it("hay casos", () => {
    expect(lista.length).toBeGreaterThanOrEqual(5);
  });

  it.each(lista)("«%s» → %s, igual que en la base", (entrada, esperado) => {
    expect(normalizarTalla(entrada)).toBe(esperado);
  });
});

describe("el nombre de una presentación según el tipo del producto", () => {
  it("cada tipo lo escribe a su manera", () => {
    expect(normalizarNombreDePresentacion("40.5", "numero")).toBe("40,5");
    expect(normalizarNombreDePresentacion("treinta", "numero")).toBeNull();
    expect(normalizarNombreDePresentacion("xl", "talla")).toBe("XL");
    expect(normalizarNombreDePresentacion(" 7,5 kg ", "tamano")).toBe("7,5 kg");
    expect(normalizarNombreDePresentacion(" US 8 ", "presentacion")).toBe("US 8");
  });
});

/* Los números que viven en dos lugares, comparados. */
describe("la aplicación y la base dicen lo mismo", () => {
  it("el tope de presentaciones", () => {
    const tope = ultimaMigracionQueDefine("limitar_variantes_por_producto");
    expect(tope).toContain(`if cantidad > ${MAXIMO_VARIANTES} then`);
    expect(tope).toContain(`hasta ${MAXIMO_VARIANTES} presentaciones`);
  });

  it("los tipos de presentación", () => {
    const modelo = ultimaMigracionQueDefine("normalizar_numero_calzado");
    const lista = TIPOS_PRESENTACION.map((tipo) => `'${tipo}'`).join(", ");
    expect(modelo).toContain(`tipo_presentacion in (${lista})`);
  });
});

describe("cómo se nombra la presentación al lado del producto", () => {
  it("cada tipo con su palabra, y lo demás tal cual", () => {
    expect(nombreConPresentacion("Zapatilla Runner", "numero", "40,5")).toBe(
      "Zapatilla Runner (N.º 40,5)",
    );
    expect(nombreConPresentacion("Remera lisa", "talla", "M")).toBe("Remera lisa (Talla M)");
    expect(nombreConPresentacion("Alimento adulto", "tamano", "7,5 kg")).toBe(
      "Alimento adulto (7,5 kg)",
    );
    expect(nombreConPresentacion("Vaso de agua", "presentacion", "Grande")).toBe(
      "Vaso de agua (Grande)",
    );
  });

  it("sin presentación, el nombre solo", () => {
    expect(nombreConPresentacion("Salteña", null, null)).toBe("Salteña");
    expect(nombreConPresentacion("Salteña", "talla", "")).toBe("Salteña");
  });
});
