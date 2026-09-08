import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/* El encabezado de una pantalla del panel estaba escrito ocho veces, una por
 * hoja de estilos, y las ocho ya se habían separado solas: la de plataforma
 * tenía el título un escalón más grande y más grueso, la de cuenta había
 * perdido la rejilla y la de resumen usaba otro espaciado. Nadie lo hizo a
 * propósito. Ocho copias de algo que tiene que verse igual terminan así
 * siempre, y es exactamente lo que se ve como «desprolijo» al recorrer el panel.
 *
 * Ahora hay un componente. Esta prueba impide que vuelvan las copias: no dice
 * cómo tiene que verse un encabezado, dice que **no se defina en otro lado**. */
const RAIZ = join(import.meta.dirname, "..", "..");

/* Solo el panel. «Encabezado» es una palabra corriente y la usan la portada, las
   páginas legales, el menú imprimible y la hoja de contactos, que son pantallas
   con su propia identidad y ninguna relación con ésta. La primera versión de
   esta prueba las marcaba a las cuatro. */
const CARPETAS = [join("app", "(admin)")];

/* La única excepción, y por una razón concreta: el esqueleto de carga dibuja la
   silueta del encabezado mientras la pantalla llega. No es un encabezado, es su
   sombra, y no puede usar el componente porque no tiene texto que poner. */
const PERMITIDOS = ["app/(admin)/dashboard/cargando.module.css"];

function hojas(directorio: string): string[] {
  return readdirSync(directorio).flatMap((nombre) => {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) return hojas(ruta);
    return nombre.endsWith(".module.css") ? [ruta] : [];
  });
}

describe("el encabezado del panel", () => {
  it("no se vuelve a definir en la hoja de cada pantalla", () => {
    const propias: string[] = [];

    for (const carpeta of CARPETAS) {
      for (const archivo of hojas(join(RAIZ, carpeta))) {
        const relativa = relative(RAIZ, archivo).replaceAll("\\", "/");
        if (relativa === "components/dashboard/encabezado-panel.module.css") continue;
        if (PERMITIDOS.includes(relativa)) continue;

        /* Se busca la clase declarada, no mencionada: un comentario que hable
           del encabezado no es una copia. */
        if (/(^|\n)\s*\.encabezado[\s,{]/.test(readFileSync(archivo, "utf8"))) {
          propias.push(relativa);
        }
      }
    }

    expect(propias, "usá <EncabezadoPanel> en vez de definir .encabezado").toEqual([]);
  });

  /* Si el componente dejara de usarse, la prueba de arriba pasaría en verde con
     el panel entero sin encabezados. Las once pantallas que lo usan son el
     piso. */
  it("lo usan las pantallas del panel", () => {
    expect(buscarUsos(join(RAIZ, "app", "(admin)"))).toBeGreaterThanOrEqual(11);
  });
});

function buscarUsos(directorio: string): number {
  return readdirSync(directorio).reduce((total, nombre) => {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) return total + buscarUsos(ruta);
    if (!nombre.endsWith(".tsx")) return total;
    return total + (readFileSync(ruta, "utf8").includes("<EncabezadoPanel") ? 1 : 0);
  }, 0);
}
