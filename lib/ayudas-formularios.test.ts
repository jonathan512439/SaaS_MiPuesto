import { describe, expect, it } from "vitest";

import {
  AYUDA_CATEGORIA,
  AYUDA_FOTO_PRODUCTO,
  AYUDA_LOGO,
  AYUDA_PORTADA,
} from "./ayudas-formularios";
import { LADO_MAXIMO_IMAGEN, PESO_MAXIMO_ORIGINAL } from "./imagenes";

describe("ayudas de los formularios", () => {
  /* Una ayuda que dice un número distinto del que el código aplica es peor que
     no tener ayuda: el dueño prepara la foto para nada. */
  it("los números salen de las constantes que de verdad se aplican", () => {
    expect(AYUDA_FOTO_PRODUCTO).toContain(String(LADO_MAXIMO_IMAGEN));
    expect(AYUDA_FOTO_PRODUCTO).toContain(
      String(Math.round(PESO_MAXIMO_ORIGINAL / (1024 * 1024))),
    );
  });

  /* 16:7 es la proporción que usan las plantillas en `aspect-ratio`. Si cambia
     ahí, esta ayuda queda mintiendo. */
  it("nombra la proporción real de la portada", () => {
    expect(AYUDA_PORTADA).toContain("16:7");
  });

  it("dicen qué hacer, no qué es", () => {
    expect(AYUDA_LOGO).toContain("Cuadrada");
    expect(AYUDA_CATEGORIA).toContain("como los busca tu cliente");
  });
});
