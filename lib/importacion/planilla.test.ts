import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { leerArchivoDePlanilla, productosDeLaPlanilla } from "./planilla";

function archivoDeTexto(texto: string, nombre = "lista.csv"): File {
  return new File([texto], nombre, { type: "text/csv" });
}

function archivoDeBytes(bytes: Uint8Array, nombre: string): File {
  return new File([bytes as BlobPart], nombre);
}

describe("abrir la planilla que trae el dueño", () => {
  it("lee un CSV y propone qué columna es cuál", async () => {
    const lectura = await leerArchivoDePlanilla(
      archivoDeTexto("Producto;Precio;Rubro\nCoca Cola 2 L;12,50;Bebidas\nPan;3;Panadería"),
    );

    expect(lectura.filas).toHaveLength(2);
    expect(lectura.mapeo.nombre).toBe(0);
    expect(lectura.mapeo.precio).toBe(1);
    expect(lectura.mapeo.categoria).toBe(2);

    const { productos } = productosDeLaPlanilla(lectura.filas, lectura.mapeo);
    expect(productos[0]).toEqual({
      nombre: "Coca Cola 2 L",
      precio: 12.5,
      descripcion: "",
      categoria: "Bebidas",
      confianza: "alta",
      cantidad: null,
    });
  });

  /* El Excel en español guarda el CSV en la codificación vieja de Windows. Sin
     el segundo intento, «Azúcar» llega con un símbolo raro en el medio y el
     dueño ve su catálogo roto sin entender por qué. */
  it("entiende un CSV guardado por el Excel en español", async () => {
    const enWindows1252 = Uint8Array.from(
      [...'Producto,Precio\nAzúcar Guabirá,7'].map((letra) => letra.charCodeAt(0)),
    );
    const lectura = await leerArchivoDePlanilla(archivoDeBytes(enWindows1252, "lista.csv"));
    const { productos } = productosDeLaPlanilla(lectura.filas, lectura.mapeo);

    expect(productos[0].nombre).toBe("Azúcar Guabirá");
  });

  it("lee un Excel de verdad de punta a punta", async () => {
    const bytes = readFileSync(join(import.meta.dirname, "pruebas", "lista-de-precios.xlsx"));
    const lectura = await leerArchivoDePlanilla(archivoDeBytes(bytes, "lista.xlsx"));

    expect(lectura.mapeo).toEqual({
      nombre: 0,
      precio: 1,
      descripcion: 2,
      categoria: 3,
      cantidad: null,
    });

    const { productos } = productosDeLaPlanilla(lectura.filas, lectura.mapeo);
    expect(productos).toHaveLength(5);
    expect(productos.map(({ nombre }) => nombre)).toContain("Azúcar Guabirá 1 kg");
    /* El precio escrito «Bs 9,50» dentro de una celda de texto vale lo mismo que
       el número 9.5 guardado como número. */
    expect(productos.find(({ nombre }) => nombre.startsWith("Arroz"))?.precio).toBe(9.5);
    expect(productos.find(({ nombre }) => nombre.startsWith("Agua"))?.precio).toBe(5.5);
    expect(productos.every(({ confianza }) => confianza === "alta")).toBe(true);
  });

  /* Lo que no entra no puede desaparecer sin dejar rastro: un renglón perdido
     en silencio es un producto que el dueño cree publicado y no está. */
  it("cuenta las filas que descarta en vez de tragárselas", () => {
    const { productos, descartadas } = productosDeLaPlanilla(
      [
        ["Pan", "3"],
        ["Sin precio", "a convenir"],
        ["", "5"],
        ["Regalo", "0"],
      ],
      { nombre: 0, precio: 1, descripcion: null, categoria: null, cantidad: null },
    );

    expect(productos).toHaveLength(1);
    expect(descartadas).toBe(3);
  });

  /* «Sin columna» y «cero» no son lo mismo. Cero es «no queda ninguno» y sale
     agotado; sin columna es «la planilla no dice». Confundirlos dejaría un
     catálogo entero publicado como agotado. */
  it("distingue una existencia en cero de una planilla que no la trae", async () => {
    const conCantidad = await leerArchivoDePlanilla(
      archivoDeTexto("Producto,Precio,Stock\nPan,3,0\nLeche,7,12"),
    );
    const { productos } = productosDeLaPlanilla(conCantidad.filas, conCantidad.mapeo);
    expect(productos.map(({ cantidad }) => cantidad)).toEqual([0, 12]);

    const sinCantidad = await leerArchivoDePlanilla(archivoDeTexto("Producto,Precio\nPan,3"));
    const sueltos = productosDeLaPlanilla(sinCantidad.filas, sinCantidad.mapeo);
    expect(sueltos.productos[0].cantidad).toBeNull();
  });

  it("explica qué hacer con un Excel del formato viejo", async () => {
    const ole2 = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
    await expect(leerArchivoDePlanilla(archivoDeBytes(ole2, "lista.xls"))).rejects.toThrow(
      /Guardar como/,
    );
  });

  /* Un PDF no es una tabla: hay que interpretarlo, y para eso está la otra
     herramienta. Mandarlo para allá es más útil que decir que no sirve. */
  it("manda el PDF a la herramienta que sí sabe leerlo", async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    await expect(leerArchivoDePlanilla(archivoDeBytes(pdf, "lista.pdf"))).rejects.toThrow(
      /Cargar desde una foto/,
    );
  });

  it("avisa cuando la planilla no tiene ninguna fila", async () => {
    await expect(leerArchivoDePlanilla(archivoDeTexto("\n\n"))).rejects.toThrow(/ninguna fila/);
  });
});
