import { describe, expect, it } from "vitest";

import { MAXIMO_ATRIBUTOS, validarAtributos } from "../catalogo/atributos";
import { camposDeCategoriaNueva, esColumnaInterna } from "./diseno-de-categoria";

describe("los campos con los que nace una categoría importada", () => {
  const mochilas = [
    { campos: { Color: "Azul", "Capacidad (litros)": "20", Impermeable: "Sí", Material: "Lona" } },
    { campos: { Color: "Rosado", "Capacidad (litros)": "25 L", Impermeable: "No", Material: "" } },
  ];

  it("arma un campo por columna, con el tipo que aceptan todos los valores", () => {
    expect(camposDeCategoriaNueva(mochilas)).toEqual([
      { nombre: "Color", tipo: "texto", unidad: null, opciones: [], enTarjeta: true },
      { nombre: "Capacidad", tipo: "numero", unidad: "litros", opciones: [], enTarjeta: true },
      { nombre: "Impermeable", tipo: "si_no", unidad: null, opciones: [], enTarjeta: true },
      { nombre: "Material", tipo: "texto", unidad: null, opciones: [], enTarjeta: false },
    ]);
  });

  /* Lo que propone tiene que pasar el mismo validador que la ruta. */
  it("lo que propone lo acepta la ruta de campos", () => {
    expect(validarAtributos(camposDeCategoriaNueva(mochilas)).correcto).toBe(true);
  });

  it("un valor que no es número deja el campo como texto, para no perderlo", () => {
    const [campo] = camposDeCategoriaNueva([
      { campos: { Medida: "30" } },
      { campos: { Medida: "media pulgada" } },
    ]);
    expect(campo.tipo).toBe("texto");
  });

  it("una columna de unos y ceros es un número, no un sí o no", () => {
    const [campo] = camposDeCategoriaNueva([{ campos: { Piezas: "1" } }, { campos: { Piezas: "0" } }]);
    expect(campo.tipo).toBe("numero");
  });

  /* Los campos se publican en la ficha del producto: el costo, el proveedor o
     el código interno no pueden terminar a la vista del cliente. */
  it("deja afuera las columnas de uso interno y los precios", () => {
    for (const titulo of ["Costo", "Precio de compra", "Proveedor", "Código", "SKU", "Stock mínimo", "Precio mayorista", "Ubicación en depósito"]) {
      expect(esColumnaInterna(titulo), titulo).toBe(true);
    }
    for (const titulo of ["Color", "Material", "Capacidad (litros)", "Para quién", "Marca"]) {
      expect(esColumnaInterna(titulo), titulo).toBe(false);
    }
    expect(camposDeCategoriaNueva([{ campos: { Costo: "80", Color: "Negro" } }]).map(({ nombre }) => nombre)).toEqual(["Color"]);
  });

  it("sin repetidos, sin columnas vacías y hasta el máximo de la base", () => {
    const campos = Object.fromEntries(Array.from({ length: MAXIMO_ATRIBUTOS + 4 }, (_, i) => [`Dato ${i + 1}`, "x"]));
    expect(camposDeCategoriaNueva([{ campos }])).toHaveLength(MAXIMO_ATRIBUTOS);
    expect(camposDeCategoriaNueva([{ campos: { color: "Azul", "Color ": "Rojo", Vacío: "  " } }]).map(({ nombre }) => nombre)).toEqual(["Color"]);
  });
});
