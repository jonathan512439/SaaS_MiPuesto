import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  AYUDA_BANNER,
  AYUDA_FOTO_PRODUCTO,
  AYUDA_LOGO,
  AYUDA_PORTADA,
  AYUDA_QR,
  FORMAS_DE_IMAGEN,
  MEDIDAS_DE_IMAGEN,
  RESUMEN_IMAGEN,
} from "./ayudas-formularios";
import { PESO_MAXIMO_ORIGINAL } from "./imagenes";
import { PROPORCION_BANNER } from "./negocios/banners";

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
    expect(formaEnElCss(/\.portada/)).toEqual([portada]);
    expect(formaEnElCss(/\.tarjetaFoto/)).toContain(tarjeta.cuadricula);
    expect(formaEnElCss(/\.tarjeta\[data-forma="fila"\] \.tarjetaFoto,\s*\.tarjeta\[data-forma="fila"\] \.sinFoto/)).toContain(tarjeta.fila);
    expect(formaEnElCss(/\.tarjeta\[data-forma="vitrina"\]/)).toContain(tarjeta.vitrina);
  });

  /* La portada tiene una sola forma en todas las pantallas, y es la que pide la
     ayuda. Cambiaba de forma según la pantalla, y una imagen subida tal como
     decía la ayuda se veía cortada igual: el dueño lo vio el 2026-10-21. */
  it("la portada se pide con la forma exacta de su caja", () => {
    const [ancho, alto] = MEDIDAS_DE_IMAGEN.portada.forma;
    expect(ancho / alto).toBe(FORMAS_DE_IMAGEN.portada);
    expect(AYUDA_PORTADA).toMatch(/se ve entera, en el celular y en la computadora/);
  });

  /* Un tamaño de ejemplo con otra forma que la anunciada es justo el error que
     el instructivo quiere evitar. */
  it("el tamaño ideal y el mínimo tienen la forma que anuncian", () => {
    for (const [imagen, { forma, ideal, minimo }] of Object.entries(MEDIDAS_DE_IMAGEN)) {
      const razon = forma[0] / forma[1];
      expect(ideal[0] / ideal[1], `${imagen}: ideal`).toBeCloseTo(razon, 2);
      expect(minimo[0] / minimo[1], `${imagen}: mínimo`).toBeCloseTo(razon, 2);
      expect(minimo[0], `${imagen}: el mínimo no pasa del ideal`).toBeLessThanOrEqual(ideal[0]);
    }
  });

  it("el banner se pide con la forma exacta de su franja", () => {
    expect(MEDIDAS_DE_IMAGEN.banner.forma).toEqual([PROPORCION_BANNER.ancho, PROPORCION_BANNER.alto]);
  });

  /* El instructivo puntual: la forma con su número, el tamaño ideal y el
     mínimo. Pedido del dueño el 2026-10-21. */
  it("cada ayuda trae la forma, el tamaño ideal y el mínimo", () => {
    const ayudas = { portada: AYUDA_PORTADA, logo: AYUDA_LOGO, banner: AYUDA_BANNER, producto: AYUDA_FOTO_PRODUCTO, qr: AYUDA_QR };
    for (const [imagen, ayuda] of Object.entries(ayudas)) {
      const { forma, ideal, minimo } = MEDIDAS_DE_IMAGEN[imagen as keyof typeof MEDIDAS_DE_IMAGEN];
      expect(ayuda, imagen).toContain(`Forma ${forma[0]}:${forma[1]}`);
      expect(ayuda, imagen).toContain(`${ideal[0]} × ${ideal[1]}`);
      expect(ayuda, imagen).toContain(`${minimo[0]} × ${minimo[1]}`);
    }
  });

  /* Sin jerga: un dueño no tiene por qué saber qué es una proporción ni un
     píxel. La forma va con su número —«16:7»—, que es lo que se escribe en un
     editor de imágenes, pero sin esas palabras. */
  it("no usa palabras técnicas", () => {
    for (const ayuda of [AYUDA_PORTADA, AYUDA_LOGO, AYUDA_FOTO_PRODUCTO, AYUDA_QR, AYUDA_BANNER]) {
      expect(ayuda).not.toMatch(/píxel|pixel|resoluci|proporci/i);
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
    for (const forma of ["4:3 en Cuadrícula", "1:1 en Una por fila", "3:4 en Vitrina"]) {
      expect(AYUDA_FOTO_PRODUCTO).toContain(forma);
    }
  });
});

/* La línea que se ve siempre junto al botón de subir (2026-10-22): corta, y con
   los mismos números que el instructivo que queda a un toque. */
describe("el resumen de cada imagen", () => {
  const instructivos = {
    portada: AYUDA_PORTADA,
    logo: AYUDA_LOGO,
    banner: AYUDA_BANNER,
    producto: AYUDA_FOTO_PRODUCTO,
    qr: AYUDA_QR,
  } as const;

  it("cabe en un renglón", () => {
    for (const [tipo, resumen] of Object.entries(RESUMEN_IMAGEN)) {
      expect(resumen.split(/s+/).length, tipo).toBeLessThanOrEqual(16);
    }
  });

  it("dice los mismos números que el instructivo completo", () => {
    for (const [tipo, { ideal, minimo }] of Object.entries(MEDIDAS_DE_IMAGEN)) {
      const resumen = RESUMEN_IMAGEN[tipo as keyof typeof RESUMEN_IMAGEN];
      const instructivo = instructivos[tipo as keyof typeof instructivos];
      for (const [ancho, alto] of [ideal, minimo]) {
        expect(resumen, tipo).toContain(`${ancho} × ${alto}`);
        expect(instructivo, tipo).toContain(`${ancho} × ${alto}`);
      }
    }
  });
});
