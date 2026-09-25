import { describe, expect, it } from "vitest";

import {
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
  });
});

/* La foto no se recorta al subirla: se achica entera y conserva su forma. Lo
   que la recorta es la tarjeta, al centro y con la forma de su categoría. */
describe("la ayuda de la foto del producto", () => {
  it("dice dónde se recorta, sin prometer una foto cuadrada", () => {
    expect(AYUDA_FOTO_PRODUCTO).not.toMatch(/cuadrad/i);
    expect(AYUDA_FOTO_PRODUCTO).toContain("recortada al centro");
  });
});
