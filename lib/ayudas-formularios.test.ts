import { describe, expect, it } from "vitest";

import {
  AYUDA_FOTO_PRODUCTO,
  AYUDA_LOGO,
  AYUDA_PORTADA,
} from "./ayudas-formularios";
import { PESO_MAXIMO_ORIGINAL } from "./imagenes";

describe("ayudas de los formularios", () => {
  /* Una ayuda que dice un número distinto del que el código aplica es peor que
     no tener ayuda: el dueño prepara la foto para nada. */
  it("los números salen de las constantes que de verdad se aplican", () => {
    expect(AYUDA_FOTO_PRODUCTO).toContain(
      `${Math.round(PESO_MAXIMO_ORIGINAL / (1024 * 1024))} MB`,
    );
  });

  /* 16:7 es la proporción que usan las plantillas en `aspect-ratio`. Desde el
     2026-10-13 la ayuda no la nombra —«menos técnico», pidió el dueño—, pero
     su ejemplo tiene que respetarla: si cambia allá, esta ayuda queda
     mintiendo. */
  it("el ejemplo de la portada respeta la proporción real", () => {
    const [, ancho, alto] = /(\d+) de ancho por (\d+) de alto/.exec(AYUDA_PORTADA) ?? [];
    expect(Number(ancho) / Number(alto)).toBeCloseTo(16 / 7, 1);
  });

  /* Sin jerga: un dueño no tiene por qué saber qué es una proporción ni un
     píxel. */
  it("no usa palabras técnicas", () => {
    for (const ayuda of [AYUDA_PORTADA, AYUDA_LOGO, AYUDA_FOTO_PRODUCTO]) {
      expect(ayuda).not.toMatch(/píxel|pixel|16:7|resoluci|proporci/i);
    }
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
