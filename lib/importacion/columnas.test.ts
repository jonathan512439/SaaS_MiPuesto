import { describe, expect, it } from "vitest";

import { analizarPlanilla } from "./columnas";

describe("adivinar qué columna es cuál", () => {
  it("usa los títulos cuando la planilla los trae", () => {
    const { cabeceras, filas, mapeo } = analizarPlanilla([
      ["Codigo", "Producto", "Precio Bs", "Detalle", "Rubro"],
      ["A-1", "Coca Cola 2 L", "12", "Bien fría", "Bebidas"],
    ]);

    expect(cabeceras).not.toBeNull();
    expect(filas).toHaveLength(1);
    expect(mapeo).toEqual({ nombre: 1, precio: 2, descripcion: 3, categoria: 4 });
  });

  /* Una columna no puede ser dos cosas. Sin reservarlas, «Producto» y
     «Descripción del producto» caerían en el mismo índice y la descripción
     repetiría el nombre en cada renglón. */
  it("no le asigna la misma columna a dos campos", () => {
    const { mapeo } = analizarPlanilla([
      ["Producto", "Descripcion del producto", "Precio"],
      ["Pan", "Integral, del día", "3"],
    ]);

    expect(mapeo.nombre).not.toBe(mapeo.descripcion);
    expect(new Set([mapeo.nombre, mapeo.precio, mapeo.descripcion]).size).toBe(3);
  });

  /* Muchas planillas de puesto no tienen fila de títulos: arrancan con el
     primer producto. Ahí hay que mirar el contenido. */
  it("se arregla sin fila de títulos", () => {
    const { cabeceras, filas, mapeo } = analizarPlanilla([
      ["Coca Cola 2 L", "12"],
      ["Agua Vital", "5"],
      ["Jugo del Valle", "10"],
    ]);

    expect(cabeceras).toBeNull();
    expect(filas).toHaveLength(3);
    expect(mapeo.nombre).toBe(0);
    expect(mapeo.precio).toBe(1);
  });

  it("encuentra el precio aunque no sea la última columna", () => {
    const { mapeo } = analizarPlanilla([
      ["Coca Cola 2 L", "12", "Bebidas"],
      ["Agua Vital", "5", "Bebidas"],
      ["Jugo del Valle", "10", "Bebidas"],
    ]);

    expect(mapeo.precio).toBe(1);
    expect(mapeo.nombre).toBe(0);
  });

  /* La palabra «bs» existe como título de columna, y es corta: buscada como
     pedazo de texto aparecería dentro de cualquier título que la contenga por
     casualidad, y esa columna se importaría como precio. */
  it("no confunde un título que apenas contiene las letras de otro", () => {
    const { mapeo } = analizarPlanilla([
      ["Producto", "Observaciones", "Bs"],
      ["Pan", "sin gluten", "3"],
    ]);

    expect(mapeo.precio).toBe(2);
  });

  /* Con títulos que no dicen nada reconocible hay que caer al contenido, no
     rendirse: una planilla en inglés o con títulos inventados es común. */
  it("cae al contenido cuando los títulos no dicen nada", () => {
    const { mapeo } = analizarPlanilla([
      ["Col1", "Col2"],
      ["Coca Cola 2 L", "12"],
      ["Agua Vital", "5"],
    ]);

    expect(mapeo.nombre).toBe(0);
    expect(mapeo.precio).toBe(1);
  });

  it("no se cae con una planilla vacía", () => {
    expect(analizarPlanilla([]).filas).toEqual([]);
  });
});
