import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  AYUDA_FOTO_PRODUCTO,
  AYUDA_LOGO,
  AYUDA_PORTADA,
  AYUDA_QR,
  FORMAS_DE_IMAGEN,
} from "./ayudas-formularios";
import { PESO_MAXIMO_ORIGINAL } from "./imagenes";

const CSS_CATALOGO = readFileSync(
  join(import.meta.dirname, "..", "components", "templates", "mipuesto", "plantilla-mipuesto.module.css"),
  "utf8",
);

/* La forma (ancho dividido alto) que el CSS le da a la caja de un selector. */
function formaEnElCss(selector: RegExp): number[] {
  const formas: number[] = [];
  const bloques = new RegExp(`${selector.source}[^{]*\\{([^}]*)\\}`, "g");
  for (const [, cuerpo] of CSS_CATALOGO.matchAll(bloques)) {
    const forma = /aspect-ratio:\s*(\d+)\s*\/\s*(\d+)/.exec(cuerpo);
    if (forma) formas.push(Number(forma[1]) / Number(forma[2]));
  }
  return formas;
}

describe("ayudas de los formularios", () => {
  /* Una ayuda que dice un número distinto del que el código aplica es peor que
     no tener ayuda: el dueño prepara la foto para nada. */
  it("los números salen de las constantes que de verdad se aplican", () => {
    expect(AYUDA_FOTO_PRODUCTO).toContain(
      `${Math.round(PESO_MAXIMO_ORIGINAL / (1024 * 1024))} MB`,
    );
  });

  /* Las formas que anota la ayuda son las del catálogo. Si el CSS cambia y la
     ayuda no, el dueño arma su imagen para una caja que ya no existe. */
  it("las formas anotadas son las que usa el catálogo", () => {
    const { portada, tarjeta } = FORMAS_DE_IMAGEN;
    expect(formaEnElCss(/\.portada/)).toEqual(
      expect.arrayContaining([portada.telefono, portada.tableta, portada.computadora]),
    );
    expect(formaEnElCss(/\.tarjetaFoto/)).toContain(tarjeta.cuadricula);
    expect(formaEnElCss(/\.tarjeta\[data-forma="fila"\] \.tarjetaFoto,\s*\.tarjeta\[data-forma="fila"\] \.sinFoto/)).toContain(tarjeta.fila);
    expect(formaEnElCss(/\.tarjeta\[data-forma="vitrina"\]/)).toContain(tarjeta.vitrina);
  });

  /* El ejemplo de la portada va a mitad de camino entre la forma del celular y
     la de la computadora: así las dos recortan lo mismo. Si una de las dos
     cambia, el ejemplo tiene que moverse con ellas. */
  it("el ejemplo de la portada recorta parejo en el celular y en la computadora", () => {
    const [, ancho, alto] = /(\d+) de ancho por (\d+) de alto/.exec(AYUDA_PORTADA) ?? [];
    const forma = Number(ancho) / Number(alto);
    const { telefono, computadora } = FORMAS_DE_IMAGEN.portada;
    expect(forma).toBeCloseTo(Math.sqrt(telefono * computadora), 1);
    expect(AYUDA_PORTADA).toMatch(/celular se cortan los costados/);
    expect(AYUDA_PORTADA).toMatch(/computadora, arriba y abajo/);
  });

  /* Sin jerga: un dueño no tiene por qué saber qué es una proporción ni un
     píxel. */
  it("no usa palabras técnicas", () => {
    for (const ayuda of [AYUDA_PORTADA, AYUDA_LOGO, AYUDA_FOTO_PRODUCTO, AYUDA_QR]) {
      expect(ayuda).not.toMatch(/píxel|pixel|16:\d|resoluci|proporci/i);
    }
  });

  it("dicen qué hacer, no qué es", () => {
    expect(AYUDA_LOGO).toContain("Cuadrada");
    expect(AYUDA_QR).toContain("Cuadrada");
  });
});

/* La foto no se recorta al subirla: se achica entera y conserva su forma. Lo
   que la recorta es la tarjeta, al centro y con la forma que el dueño eligió en
   Apariencia. Ninguna entra entera en las tres; la cuadrada es la que menos
   pierde, y la ayuda lo dice sin prometer que no se corta. */
describe("la ayuda de la foto del producto", () => {
  it("dice dónde se recorta y dónde se ve entera", () => {
    expect(AYUDA_FOTO_PRODUCTO).toContain("se recorta al centro");
    expect(AYUDA_FOTO_PRODUCTO).toContain("se ve entera");
    for (const forma of ["Cuadrícula", "Una por fila", "Vitrina"]) {
      expect(AYUDA_FOTO_PRODUCTO).toContain(forma);
    }
  });
});
