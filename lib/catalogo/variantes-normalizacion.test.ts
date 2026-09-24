import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ATAJOS_DE_PRESENTACIONES,
  MAXIMO_VARIANTES,
  TIPOS_PRESENTACION,
  normalizarNombreDePresentacion,
  normalizarNumeroCalzado,
  normalizarTalla,
  nombreConPresentacion,
  ordenarPresentaciones,
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

describe("el orden de las presentaciones", () => {
  const nombres = (lista: Array<{ nombre: string }>) => lista.map(({ nombre }) => nombre);

  it("los números, de menor a mayor, con los medios en su lugar", () => {
    const lista = ["42", "38,5", "40", "38", "41"].map((nombre) => ({ nombre }));
    expect(nombres(ordenarPresentaciones("numero", lista))).toEqual(["38", "38,5", "40", "41", "42"]);
  });

  it("las tallas de siempre en su orden, y lo escrito a mano al final en el suyo", () => {
    const lista = ["XL", "2 años", "S", "Única", "M", "1 año"].map((nombre) => ({ nombre }));
    expect(nombres(ordenarPresentaciones("talla", lista))).toEqual([
      "S",
      "M",
      "XL",
      "Única",
      "2 años",
      "1 año",
    ]);
  });

  it("los tamaños y lo demás, como los acomodó el dueño", () => {
    const lista = ["Familiar", "Personal", "Mediana"].map((nombre) => ({ nombre }));
    expect(nombres(ordenarPresentaciones("tamano", lista))).toEqual(["Familiar", "Personal", "Mediana"]);
    expect(nombres(ordenarPresentaciones("presentacion", lista))).toEqual([
      "Familiar",
      "Personal",
      "Mediana",
    ]);
  });
});

describe("los atajos del editor", () => {
  const atajo = (id: string) => ATAJOS_DE_PRESENTACIONES.find((uno) => uno.id === id)!;

  it("generan exactamente la lista que dicen", () => {
    expect(atajo("numeros-varon").generar(false)).toEqual(["38", "39", "40", "41", "42", "43", "44", "45"]);
    expect(atajo("numeros-dama").generar(true)).toEqual([
      "35", "35,5", "36", "36,5", "37", "37,5", "38", "38,5", "39", "39,5", "40",
    ]);
    expect(atajo("tallas-s-xxl").generar(false)).toEqual(["S", "M", "L", "XL", "XXL"]);
  });

  it("todo lo que generan lo acepta la base y entra en el tope", () => {
    for (const uno of ATAJOS_DE_PRESENTACIONES) {
      for (const conMedios of uno.admiteMedios ? [false, true] : [false]) {
        const lista = uno.generar(conMedios);
        expect(lista.length, `${uno.etiqueta} pasa el tope`).toBeLessThanOrEqual(MAXIMO_VARIANTES);
        for (const nombre of lista) {
          expect(normalizarNombreDePresentacion(nombre, uno.tipo), `${uno.etiqueta}: ${nombre}`).toBe(nombre);
        }
      }
    }
  });
});
