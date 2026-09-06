import { describe, expect, it } from "vitest";

import {
  LIMITE_ARCHIVOS_BYTES,
  calcularPorcentaje,
  formatearBytes,
  negociosQueTodaviaEntran,
  nivelDeUso,
} from "./almacenamiento";

const MB = 1024 * 1024;

describe("uso de almacenamiento", () => {
  it("formatea en la unidad que se lee de un vistazo", () => {
    expect(formatearBytes(0)).toBe("0 B");
    expect(formatearBytes(900)).toBe("900 B");
    expect(formatearBytes(2 * MB)).toBe("2.0 MB");
    expect(formatearBytes(812 * MB)).toBe("812 MB");
    expect(formatearBytes(LIMITE_ARCHIVOS_BYTES)).toBe("1.0 GB");
  });

  it("calcula la proporción con un decimal", () => {
    expect(calcularPorcentaje(512 * MB, LIMITE_ARCHIVOS_BYTES)).toBe(50);
    expect(calcularPorcentaje(0, LIMITE_ARCHIVOS_BYTES)).toBe(0);
    /* Nunca pasa de 100: un medidor en 137 % asusta sin informar. */
    expect(calcularPorcentaje(2 * LIMITE_ARCHIVOS_BYTES, LIMITE_ARCHIVOS_BYTES)).toBe(100);
  });

  /* Se avisa a la mitad y no al 90 %: mudarse de plan lleva días, y enterarse
     con el disco lleno es enterarse tarde. */
  it("avisa con tiempo", () => {
    expect(nivelDeUso(100 * MB, LIMITE_ARCHIVOS_BYTES)).toBe("holgado");
    expect(nivelDeUso(600 * MB, LIMITE_ARCHIVOS_BYTES)).toBe("atencion");
    expect(nivelDeUso(900 * MB, LIMITE_ARCHIVOS_BYTES)).toBe("critico");
  });

  it("estima cuántos negocios más entran", () => {
    // Diez negocios ocupando 10 MB cada uno: el promedio es 10 MB.
    expect(negociosQueTodaviaEntran(100 * MB, 10, 1024 * MB)).toBe(92);
    expect(negociosQueTodaviaEntran(1024 * MB, 10, 1024 * MB)).toBe(0);
  });

  it("no estima nada cuando todavía no hay de dónde", () => {
    expect(negociosQueTodaviaEntran(0, 0)).toBe(null);
    expect(negociosQueTodaviaEntran(100 * MB, 0)).toBe(null);
  });
});
