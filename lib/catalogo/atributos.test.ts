import { describe, expect, it } from "vitest";

import {
  MAXIMO_ATRIBUTOS,
  MAXIMO_EN_TARJETA,
  claveDesdeNombre,
  formatearValor,
  leerAtributos,
  validarAtributos,
  type Atributo,
} from "./atributos";

const texto = { clave: "material", nombre: "Material", tipo: "texto" as const };
const numero = { clave: "potencia", nombre: "Potencia", tipo: "numero" as const, unidad: "W" };
const opcion = {
  clave: "casquillo",
  nombre: "Casquillo",
  tipo: "opcion" as const,
  opciones: ["E27", "E14", "GU10"],
};
const siNo = { clave: "regulable", nombre: "Regulable", tipo: "si_no" as const };

describe("claveDesdeNombre", () => {
  it("saca tildes, espacios y mayúsculas", () => {
    expect(claveDesdeNombre("Potencia")).toBe("potencia");
    expect(claveDesdeNombre("Color de luz")).toBe("color_de_luz");
    expect(claveDesdeNombre("Año desde")).toBe("ano_desde");
    expect(claveDesdeNombre("Peso (kg)")).toBe("peso_kg");
  });

  /* La base exige que empiece por letra. Un nombre que no deja nada utilizable
     tiene que dar una clave válida igual, o el guardado fallaría con un error de
     restricción que el dueño no puede entender. */
  it("siempre devuelve algo que la base acepta", () => {
    const formato = /^[a-z][a-z0-9_]{1,30}$/;
    for (const nombre of ["¿?", "---", "123", "  ", "9 W", "ñ"]) {
      expect(claveDesdeNombre(nombre), nombre).toMatch(formato);
    }
  });

  it("no repite una clave que ya está en uso", () => {
    expect(claveDesdeNombre("Material", ["material"])).toBe("material_2");
    expect(claveDesdeNombre("Material", ["material", "material_2"])).toBe("material_3");
  });

  it("no se pasa del largo que admite la columna", () => {
    const largo = claveDesdeNombre("Un nombre larguísimo que no va a entrar en la columna nunca");
    expect(largo.length).toBeLessThanOrEqual(31);
  });
});

describe("validarAtributos: los cuatro tipos", () => {
  it("acepta uno de cada tipo", () => {
    const resultado = validarAtributos([texto, numero, opcion, siNo]);
    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) expect(resultado.atributos).toHaveLength(4);
  });

  it("acepta que no haya ninguno, que es lo normal al empezar", () => {
    expect(validarAtributos([])).toEqual({ correcto: true, atributos: [] });
    expect(validarAtributos(undefined)).toEqual({ correcto: true, atributos: [] });
  });

  it("rechaza un tipo inventado", () => {
    const resultado = validarAtributos([{ ...texto, tipo: "fecha" }]);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores["atributos.0.tipo"]).toBeTruthy();
  });

  it("exige el nombre", () => {
    const resultado = validarAtributos([{ ...texto, nombre: "   " }]);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores["atributos.0.nombre"]).toBeTruthy();
  });
});

describe("validarAtributos: opciones", () => {
  it("rechaza una lista sin opciones", () => {
    const resultado = validarAtributos([{ ...opcion, opciones: [] }]);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores["atributos.0.opciones"]).toBeTruthy();
  });

  it("rechaza una lista con una sola opción", () => {
    expect(validarAtributos([{ ...opcion, opciones: ["E27"] }]).correcto).toBe(false);
  });

  it("rechaza veinticinco opciones", () => {
    const muchas = Array.from({ length: 25 }, (_, i) => `opcion-${i}`);
    expect(validarAtributos([{ ...opcion, opciones: muchas }]).correcto).toBe(false);
  });

  /* Se limpian y se desduplican **antes** de contar. Una lista con «E27», «E27 »
     y vacío tiene una sola opción de verdad, y decirle al dueño que tiene tres lo
     dejaría buscando el error donde no está. */
  it("no cuenta como dos una opción repetida con espacios", () => {
    const resultado = validarAtributos([{ ...opcion, opciones: ["E27", "E27 ", "  ", ""] }]);
    expect(resultado.correcto).toBe(false);
  });

  it("limpia y desduplica las que sí guarda", () => {
    const resultado = validarAtributos([{ ...opcion, opciones: [" E27 ", "E14", "E27"] }]);
    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) expect(resultado.atributos[0].opciones).toEqual(["E27", "E14"]);
  });

  it("rechaza opciones en un campo que no es de lista", () => {
    const resultado = validarAtributos([{ ...texto, opciones: ["A", "B"] }]);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores["atributos.0.opciones"]).toBeTruthy();
  });
});

describe("validarAtributos: unidad", () => {
  it("acepta un número sin unidad, como «Año desde»", () => {
    const resultado = validarAtributos([{ clave: "ano", nombre: "Año desde", tipo: "numero" }]);
    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) expect(resultado.atributos[0].unidad).toBeNull();
  });

  it("rechaza unidad en un campo que no es número", () => {
    const resultado = validarAtributos([{ ...texto, unidad: "kg" }]);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores["atributos.0.unidad"]).toBeTruthy();
  });

  it("rechaza una unidad larguísima", () => {
    expect(validarAtributos([{ ...numero, unidad: "kilogramos por metro cuadrado" }]).correcto).toBe(
      false,
    );
  });
});

describe("validarAtributos: los topes del conjunto", () => {
  function unos(cantidad: number, enTarjeta = false) {
    return Array.from({ length: cantidad }, (_, i) => ({
      clave: `campo_${i}`,
      nombre: `Campo ${i}`,
      tipo: "texto" as const,
      enTarjeta,
    }));
  }

  it("acepta diez", () => {
    expect(validarAtributos(unos(MAXIMO_ATRIBUTOS)).correcto).toBe(true);
  });

  it("rechaza el once", () => {
    const resultado = validarAtributos(unos(MAXIMO_ATRIBUTOS + 1));
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores.atributos).toContain("10");
  });

  it("acepta seis en la tarjeta", () => {
    expect(validarAtributos(unos(MAXIMO_EN_TARJETA, true)).correcto).toBe(true);
  });

  it("rechaza el séptimo en la tarjeta", () => {
    const resultado = validarAtributos(unos(MAXIMO_EN_TARJETA + 1, true));
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores.atributos).toContain("tarjeta");
  });

  /* Dos campos con el mismo nombre dan la misma clave, y uno pisaría el valor del
     otro en todos los productos. El error va sobre el nombre, que es lo que el
     dueño ve y puede corregir; la clave no la escribe nunca. */
  it("rechaza dos campos con el mismo nombre", () => {
    const resultado = validarAtributos([
      { nombre: "Material", tipo: "texto" },
      { nombre: "Material", tipo: "texto" },
    ]);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) {
      expect(resultado.errores["atributos.1.nombre"]).toContain("Ya hay otro campo");
    }
  });

  it("deriva la clave cuando no viene, sin repetirla", () => {
    const resultado = validarAtributos([
      { nombre: "Potencia", tipo: "numero", unidad: "W" },
      { nombre: "Color de luz", tipo: "opcion", opciones: ["Cálida", "Fría"] },
    ]);
    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) {
      expect(resultado.atributos.map(({ clave }) => clave)).toEqual(["potencia", "color_de_luz"]);
    }
  });

  it("rechaza una clave que la base no aceptaría", () => {
    const resultado = validarAtributos([{ ...texto, clave: "Material" }]);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores["atributos.0.clave"]).toBeTruthy();
  });

  it("no rompe con lo que no es una lista", () => {
    expect(validarAtributos("dos campos").correcto).toBe(false);
    expect(validarAtributos([null, 7]).correcto).toBe(false);
  });
});

describe("leerAtributos", () => {
  /* Lo contrario del validador: acá no hay a quién avisarle, porque se usa al
     dibujar el catálogo público. Un campo mal formado no puede dejar la ficha sin
     cargar. */
  it("descarta en silencio lo que está mal formado", () => {
    expect(leerAtributos([{ clave: "", nombre: "Material", tipo: "texto" }])).toEqual([]);
    expect(leerAtributos([{ clave: "material", nombre: "", tipo: "texto" }])).toEqual([]);
    expect(leerAtributos([{ clave: "material", nombre: "Material", tipo: "fecha" }])).toEqual([]);
    expect(leerAtributos(null)).toEqual([]);
  });

  /* La base usa `en_tarjeta` y el cliente `enTarjeta`. Se aceptan los dos porque
     esta función lee filas que vienen de los dos lados. */
  it("entiende el nombre de columna de la base y el del cliente", () => {
    expect(leerAtributos([{ ...texto, en_tarjeta: true }])[0].enTarjeta).toBe(true);
    expect(leerAtributos([{ ...texto, enTarjeta: true }])[0].enTarjeta).toBe(true);
  });

  it("en el resumen por omisión, porque cargar el dato ya es querer mostrarlo", () => {
    expect(leerAtributos([texto])[0].enResumen).toBe(true);
    expect(leerAtributos([{ ...texto, en_resumen: false }])[0].enResumen).toBe(false);
  });
});

describe("formatearValor", () => {
  const definicion = (parcial: Partial<Atributo>): Atributo => ({
    clave: "x",
    nombre: "X",
    tipo: "texto",
    unidad: null,
    opciones: [],
    obligatorio: false,
    enTarjeta: false,
    enResumen: true,
    ...parcial,
  });

  it("pega la unidad al número", () => {
    expect(formatearValor(definicion({ tipo: "numero", unidad: "W" }), 9)).toBe("9 W");
    expect(formatearValor(definicion({ tipo: "numero" }), 2015)).toBe("2015");
  });

  it("traduce el sí y el no", () => {
    expect(formatearValor(definicion({ tipo: "si_no" }), true)).toBe("Sí");
    expect(formatearValor(definicion({ tipo: "si_no" }), false)).toBe("No");
  });

  /* Devuelve nulo en vez de una cadena vacía o «undefined»: quien dibuja
     pregunta si hay valor, y un texto vacío ocuparía una fila de la ficha. */
  it("devuelve nulo cuando no hay valor o no es del tipo que dice", () => {
    expect(formatearValor(definicion({}), null)).toBeNull();
    expect(formatearValor(definicion({}), "")).toBeNull();
    expect(formatearValor(definicion({ tipo: "numero" }), "mucho")).toBeNull();
    expect(formatearValor(definicion({ tipo: "si_no" }), "sí")).toBeNull();
  });
});
