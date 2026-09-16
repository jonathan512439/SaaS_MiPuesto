import { describe, expect, it } from "vitest";

import { analizarPlanilla } from "../importacion/columnas";
import { leerXlsx } from "../importacion/xlsx";
import { leerPrecio } from "../importacion/valores";
import { exportarCatalogo, filasDelCatalogo, nombreDeArchivo, type ProductoExportable } from "./catalogo";
import { armarXlsx } from "./xlsx";

/* La exportación es la red de seguridad del cambio de rubro: el sistema vacía el
 * catálogo y lo único que queda es este archivo. Si el archivo no se puede
 * volver a cargar, no era una red de seguridad: era un souvenir.
 *
 * Por eso estas pruebas no comprueban el XML por dentro —eso no le importa a
 * nadie—: escriben la planilla y la leen **con el importador de verdad**, el
 * mismo que va a usar el dueño. Es la única forma de que un cambio en cualquiera
 * de las dos puntas se note acá y no el día que alguien necesite recuperar su
 * catálogo.
 */
const CATALOGO: ProductoExportable[] = [
  {
    codigo: "P-001",
    nombre: "Café con leche",
    descripcion: "Grande, con canela",
    precio: 12.5,
    categoria: "Bebidas",
    subcategoria: "Calientes",
    controla_stock: true,
    cantidad_stock: 40,
    visible: true,
  },
  {
    codigo: "P-002",
    /* Con `&` y con `<`: sin escapar, el XML queda mal formado y Excel se niega
       a abrir el archivo entero diciendo que está dañado, sin decir dónde. Un
       nombre así es completamente normal en una lista de precios. */
    nombre: "Empanada de carne & queso <especial>",
    descripcion: null,
    precio: 8,
    categoria: "Comidas",
    subcategoria: null,
    controla_stock: false,
    cantidad_stock: null,
    visible: false,
  },
];

async function volverALeer(archivo: Uint8Array) {
  const copia = archivo.slice();
  const { filas } = await leerXlsx(copia.buffer as ArrayBuffer);
  return filas;
}

describe("la exportación del catálogo", () => {
  it("se vuelve a leer con el importador y da las mismas filas", async () => {
    const filas = await volverALeer(exportarCatalogo(CATALOGO));
    expect(filas).toEqual(filasDelCatalogo(CATALOGO));
  });

  it("el importador reconoce solo las columnas que tiene que reconocer", async () => {
    const filas = await volverALeer(exportarCatalogo(CATALOGO));
    const planilla = analizarPlanilla(filas);

    /* Los títulos están elegidos para que esto salga sin que el dueño toque
       nada. Si alguien los cambia, esta prueba es la que avisa. */
    expect(planilla.cabeceras).not.toBeNull();
    expect(planilla.mapeo.nombre).toBe(0);
    expect(planilla.mapeo.precio).toBe(1);
    expect(planilla.mapeo.descripcion).toBe(2);
    expect(planilla.mapeo.categoria).toBe(3);
    expect(planilla.mapeo.cantidad).toBe(4);
  });

  it("los productos vuelven con su nombre, su precio y su categoría", async () => {
    const filas = await volverALeer(exportarCatalogo(CATALOGO));
    const { filas: datos, mapeo } = analizarPlanilla(filas);

    expect(datos).toHaveLength(CATALOGO.length);
    datos.forEach((fila, indice) => {
      const esperado = CATALOGO[indice];
      expect(fila[mapeo.nombre]).toBe(esperado.nombre);
      expect(leerPrecio(fila[mapeo.precio])).toBe(esperado.precio);
      expect(fila[mapeo.categoria!]).toBe(esperado.categoria ?? "");
    });
  });

  it("el precio viaja como número y no como texto", async () => {
    /* Escrito como texto, la columna no suma en Excel y un Excel en español
       puede leer la coma decimal a su manera al reimportarla. */
    const filas = await volverALeer(exportarCatalogo(CATALOGO));
    expect(filas[1][1]).toBe("12.50");
    expect(leerPrecio(filas[1][1])).toBe(12.5);
  });

  it("distingue «no queda ninguno» de «no se cuentan»", () => {
    const [conStock, sinStock] = filasDelCatalogo(CATALOGO).slice(1);
    expect(conStock[4]).toBe("40");
    /* Vacío, no «0»: un cero diría que no queda nada, que es lo contrario. */
    expect(sinStock[4]).toBe("");
  });

  it("aguanta un catálogo vacío", async () => {
    const filas = await volverALeer(exportarCatalogo([]));
    expect(filas).toEqual([filasDelCatalogo([])[0]]);
  });

  it("el archivo lleva el negocio y la fecha, porque se exporta más de una vez", () => {
    expect(nombreDeArchivo("broaster-saolito", new Date("2026-09-16T12:00:00Z"))).toBe(
      "catalogo-broaster-saolito-2026-09-16.xlsx",
    );
  });
});

describe("el escritor de planillas", () => {
  it("escribe una celda vacía como celda ausente y no como texto vacío", async () => {
    const filas = await volverALeer(armarXlsx([["uno", "", "tres"]]));
    expect(filas).toEqual([["uno", "", "tres"]]);
  });

  it("recorta el nombre de la pestaña en vez de dejar un archivo que no abre", async () => {
    /* Excel rechaza el archivo entero si la pestaña pasa de 31 caracteres o
       lleva uno de los prohibidos, y no dice cuál era. */
    const archivo = armarXlsx([["a"]], "Catálogo/de:prueba[muy] largo que no entra en Excel");
    const filas = await volverALeer(archivo);
    expect(filas).toEqual([["a"]]);
  });
});
