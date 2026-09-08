import { describe, expect, it } from "vitest";

import { leerCsv } from "./csv";

describe("lector de CSV", () => {
  it("usa el separador que trae el archivo", () => {
    expect(leerCsv("Producto,Precio\nPan,3")).toEqual([
      ["Producto", "Precio"],
      ["Pan", "3"],
    ]);

    /* El Excel en español exporta con punto y coma, porque la coma ya es el
       separador decimal. Es el caso más común en Bolivia y `split(",")` lo
       leería como una sola columna. */
    expect(leerCsv("Producto;Precio\nPan;3,50")).toEqual([
      ["Producto", "Precio"],
      ["Pan", "3,50"],
    ]);
  });

  it("respeta lo que está entre comillas", () => {
    expect(leerCsv('Producto,Precio\n"Pan, integral",3')).toEqual([
      ["Producto", "Precio"],
      ["Pan, integral", "3"],
    ]);
    expect(leerCsv('Producto\n"Pan ""especial"""')).toEqual([["Producto"], ['Pan "especial"']]);
  });

  it("no deja una fila vacía por cada salto de Windows", () => {
    expect(leerCsv("Pan,3\r\nLeche,7\r\n")).toEqual([
      ["Pan", "3"],
      ["Leche", "7"],
    ]);
  });

  /* La marca invisible del principio se pega al nombre de la primera columna.
     Sin quitarla, la cabecera «Producto» deja de reconocerse y el importador
     no encuentra la columna del nombre. */
  it("quita la marca invisible del comienzo", () => {
    const [cabeceras] = leerCsv("\ufeffProducto,Precio\nPan,3");
    expect(cabeceras[0]).toBe("Producto");
  });

  it("descarta los renglones en blanco entre secciones", () => {
    expect(leerCsv("Pan,3\n\n,\nLeche,7")).toEqual([
      ["Pan", "3"],
      ["Leche", "7"],
    ]);
  });
});
