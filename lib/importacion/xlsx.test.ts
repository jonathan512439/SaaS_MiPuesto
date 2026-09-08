import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { leerXlsx } from "./xlsx";

/* Los dos archivos de `pruebas/` no son iguales a propósito.

   `lista-de-precios.xlsx` lo generó openpyxl, una implementación ajena: sirve
   para comprobar el lector contra un ZIP que no escribió este proyecto.
   Descubrió algo en el primer intento —guarda el texto dentro de la celda, sin
   tabla compartida—, que es justo lo que un archivo hecho a medida no habría
   mostrado.

   `con-textos-compartidos.xlsx` cubre la otra mitad, que es como guarda el
   Excel de Microsoft: las palabras van en una tabla aparte y la celda apunta a
   ella por número. Sin este archivo, esa rama no se ejecutaría nunca. */
function abrir(nombre: string): ArrayBuffer {
  const bytes = readFileSync(join(import.meta.dirname, "pruebas", nombre));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

describe("lector de Excel", () => {
  it("lee un archivo generado por otra herramienta", async () => {
    const { filas } = await leerXlsx(abrir("lista-de-precios.xlsx"));

    expect(filas[0]).toEqual(["Producto", "Precio Bs", "Detalle", "Categoria"]);
    expect(filas[1]).toEqual(["Coca Cola 2 litros", "12", "Bien fría", "Bebidas"]);

    /* La fila sin detalle tiene la celda C ausente, no vacía. Si el lector
       apilara las celdas en orden, «Bebidas» caería en la columna del detalle y
       la categoría se perdería. */
    expect(filas[2]).toEqual(["Agua Vital 600 ml", "5.5", "", "Bebidas"]);

    /* La fila en blanco del medio no llega como un producto sin nombre. */
    expect(filas).toHaveLength(6);
    expect(filas[3][0]).toBe("Arroz Grano de Oro 1 kg");

    /* Acentos y el ampersand, que en el XML viajan escapados. */
    expect(filas[4][0]).toBe("Aceite & vinagre «Fino»");
    expect(filas[5][0]).toBe("Azúcar Guabirá 1 kg");
  });

  it("no se lleva la segunda hoja del libro", async () => {
    const { filas } = await leerXlsx(abrir("lista-de-precios.xlsx"));
    expect(filas.flat()).not.toContain("esto no se debe leer");
  });

  it("lee el texto guardado en la tabla compartida", async () => {
    const { filas } = await leerXlsx(abrir("con-textos-compartidos.xlsx"));

    expect(filas[0]).toEqual(["Producto", "Precio", "Categoría"]);
    /* El nombre está partido en tres pedazos porque una parte tenía otro
       formato. Tomar solo el primero daría «Coca ». */
    expect(filas[1]).toEqual(["Coca Cola 2 litros", "12", "Bebidas"]);
    expect(filas[2]).toEqual(["Pan & queso", "", "Bebidas"]);
  });

  /* Los tres casos siguientes salieron de un archivo que el dueño no podía
     importar: la pantalla decía «no tiene ninguna fila» delante de una planilla
     llena. Cada uno se reprodujo antes de tocar el lector. */

  /* Excel numera `sheet1.xml`, `sheet2.xml`… por orden de creación, no por el
     orden de las pestañas. Quien armó su lista en la segunda pestaña, o borró y
     rehízo la primera, tiene sus datos en `sheet2.xml`. Leyendo por nombre de
     archivo se devolvían cero filas. */
  it("encuentra los datos aunque estén en la segunda pestaña", async () => {
    const { filas, hojasRevisadas } = await leerXlsx(abrir("segunda-hoja.xlsx"));

    expect(hojasRevisadas).toBe(2);
    expect(filas).toEqual([
      ["Producto", "Precio"],
      ["Pan", "3"],
      ["Leche", "7"],
    ]);
  });

  /* Las etiquetas pueden venir con prefijo de espacio de nombres: `<x:row>` en
     vez de `<row>`. Las dos formas describen el mismo archivo y hay
     generadores de cada bando. Buscando solo `<row` no se encontraba nada. */
  it("lee un archivo cuyas etiquetas traen prefijo", async () => {
    const { filas } = await leerXlsx(abrir("prefijos.xlsx"));

    expect(filas).toEqual([
      ["Producto", "Precio"],
      ["Pan", "3"],
    ]);
  });

  /* Una celda vacía pero con formato —pintada, o con borde— se escribe cerrada
     en sí misma: `<c r="B2" s="1"/>`. Sin contemplarlo, la búsqueda del cierre
     se comía la celda siguiente y **el precio se corría de columna**, que es
     peor que fallar: no avisa. */
  it("mantiene las columnas alineadas con celdas vacías con formato", async () => {
    const { filas } = await leerXlsx(abrir("autocerradas.xlsx"));

    expect(filas).toEqual([
      ["Producto", "", "Precio"],
      ["Pan", "", "3"],
    ]);
  });

  it("avisa cuando el archivo no es un Excel", async () => {
    const cualquierCosa = new TextEncoder().encode("esto no es un zip");
    await expect(leerXlsx(cualquierCosa.buffer as ArrayBuffer)).rejects.toThrow("no-es-zip");
  });
});
