import { describe, expect, it } from "vitest";

import { AYUDA_LISTA, AYUDA_PRODUCTO, esAvisoDeFotoReciente } from "./ayuda";

const AHORA = new Date("2026-03-10T12:00:00.000Z");

function haceDias(dias: number) {
  return new Date(AHORA.getTime() - dias * 86_400_000).toISOString();
}

describe("aviso de función nueva", () => {
  it("se muestra la primera semana y después se apaga solo", () => {
    expect(esAvisoDeFotoReciente(haceDias(0), AHORA)).toBe(true);
    expect(esAvisoDeFotoReciente(haceDias(6), AHORA)).toBe(true);
    expect(esAvisoDeFotoReciente(haceDias(7), AHORA)).toBe(false);
    expect(esAvisoDeFotoReciente(haceDias(30), AHORA)).toBe(false);
  });

  it("tolera que no haya fecha", () => {
    expect(esAvisoDeFotoReciente(null, AHORA)).toBe(false);
    expect(esAvisoDeFotoReciente(undefined, AHORA)).toBe(false);
    expect(esAvisoDeFotoReciente("no es una fecha", AHORA)).toBe(false);
  });
});

describe("indicaciones para el dueño", () => {
  /* El ejemplo es la parte que más se mira y la que más fácil se rompe al
     editar: si la entrada y la salida dejan de corresponderse, enseña mal. */
  it("el ejemplo convierte el título en categoría y junta los dos tamaños en un producto", () => {
    const { entrada, salida, nota } = AYUDA_LISTA.ejemplo;
    const titulo = entrada[0];
    const nombres = salida.map(({ nombre }) => nombre);
    expect(nombres).not.toContain(titulo);
    const mochila = salida.filter(({ nombre }) => nombre.startsWith("Mochila"));
    expect(mochila).toHaveLength(1);
    expect(mochila[0].precio).toContain("120");
    expect(mochila[0].precio).toContain("85");
    expect(nota).toContain(titulo);
    /* El título de sección no se tira: es la categoría de lo que viene debajo,
       escrita como nombre propio y no en mayúsculas. */
    expect(salida.every(({ categoria }) => categoria.toUpperCase() === titulo)).toBe(true);
    expect(salida[0].categoria).not.toBe(titulo);
  });

  it("avisa que el precio no sale de la foto", () => {
    expect(AYUDA_PRODUCTO.advertencia.toLowerCase()).toContain("precio");
  });
});
