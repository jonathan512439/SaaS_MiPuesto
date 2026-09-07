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
  it("el ejemplo convierte el título en categoría y desdobla los dos tamaños", () => {
    const salida = AYUDA_LISTA.ejemplo.salida;
    const nombres = salida.map(({ nombre }) => nombre);
    expect(nombres).not.toContain("ALMUERZOS");
    expect(nombres.filter((nombre) => nombre.startsWith("Pique macho"))).toHaveLength(2);
    expect(AYUDA_LISTA.ejemplo.entrada.some((linea) => linea.includes("ALMUERZOS"))).toBe(true);
    /* El título de sección no se tira: es la categoría de lo que viene debajo. */
    expect(salida.every(({ categoria }) => categoria === "Almuerzos")).toBe(true);
  });

  it("avisa que el precio no sale de la foto", () => {
    expect(AYUDA_PRODUCTO.advertencia.toLowerCase()).toContain("precio");
  });
});
