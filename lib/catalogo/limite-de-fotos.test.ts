import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { MAXIMO_FOTOS_POR_PRODUCTO } from "./validacion";

/* Cuántas fotos admite un producto lo comprueban tres lugares que no se hablan
   entre sí: el panel al elegir los archivos, la pantalla de revisión de una
   importación, y la ruta que las recibe.
 *
 * Estaba escrito a mano en cada uno. Tres números sueltos que tienen que
 * coincidir terminan no coincidiendo: el día que suba a seis, la pantalla
 * dejaría elegir seis y la ruta rechazaría las dos últimas con un error que el
 * dueño no puede entender ni evitar.
 *
 * Esta prueba no comprueba el número: comprueba que **no haya un número**. */
const RAIZ = join(import.meta.dirname, "..", "..");
const CARPETAS = ["app", "components"];

/* Una comparación del tipo `fotos.length >= 4` o `imagenes.length + n > 4`. Se
   pide un número del lado derecho a propósito: contra la constante no coincide,
   que es exactamente lo que tiene que pasar.

   **Comparar contra cero no cuenta.** `fotos.length > 0` pregunta «¿tiene
   alguna?», que no es el límite y nunca cambia cuando el límite cambie. La
   primera versión de esta prueba las marcaba y habría obligado a inventar una
   constante para el cero. */
const COMPARACION_CON_NUMERO =
  /(?:fotos|imagenes[A-Za-z]*)\.length\s*[+\-\s\w.]*[<>=]=?\s*(\d+)/;

function archivosDeCodigo(directorio: string): string[] {
  return readdirSync(directorio).flatMap((nombre) => {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) return archivosDeCodigo(ruta);
    return /\.tsx?$/.test(nombre) && !nombre.includes(".test.") ? [ruta] : [];
  });
}

describe("el límite de fotografías por producto", () => {
  it("no está escrito a mano en ninguna pantalla ni ruta", () => {
    const hallazgos: string[] = [];

    for (const carpeta of CARPETAS) {
      for (const archivo of archivosDeCodigo(join(RAIZ, carpeta))) {
        const lineas = readFileSync(archivo, "utf8").split(/\r?\n/);
        lineas.forEach((linea, numero) => {
          const contra = COMPARACION_CON_NUMERO.exec(linea)?.[1];
          if (contra !== undefined && Number(contra) !== 0) {
            hallazgos.push(`${relative(RAIZ, archivo)}:${numero + 1} → ${linea.trim()}`);
          }
        });
      }
    }

    expect(hallazgos, "usa MAXIMO_FOTOS_POR_PRODUCTO en vez de un número").toEqual([]);
  });

  /* Si alguien borrara los usos, la prueba de arriba seguiría pasando sin
     comprobar nada. El tope **del plan** tiene que estar en uso en las dos
     pantallas y en la ruta que recibe las imágenes: desde el 2026-09-25 cada
     plan tiene el suyo (`lib/planes.ts`), y la constante fija de antes habría
     dejado elegir cuatro fotos en el plan que incluye tres. */
  it("se usa el del plan donde importa", () => {
    const obligatorios = [
      "components/catalogo/gestor-catalogo.tsx",
      "components/catalogo/revision-de-productos.tsx",
      "app/api/catalogo/imagenes/route.ts",
    ];

    for (const relativa of obligatorios) {
      const fuente = readFileSync(join(RAIZ, relativa), "utf8");
      expect(fuente, `${relativa} no usa el tope del plan`).toContain("fotosPorProducto");
      expect(fuente, `${relativa} usa el techo fijo en vez del plan`).not.toContain(
        "MAXIMO_FOTOS_POR_PRODUCTO",
      );
    }

    expect(MAXIMO_FOTOS_POR_PRODUCTO).toBeGreaterThan(0);
  });
});
