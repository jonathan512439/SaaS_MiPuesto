import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { DOMINIO_MIPUESTO } from "../url-sitio";

const RAIZ = join(import.meta.dirname, "../..");

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.(ts|tsx)$/.test(nombre) ? [ruta] : [];
  });
}

/* El dominio de MiPuesto es mi-puesto.com, con guion. El otro, sin guion, lo
   tiene un tercero desde 2004: una pantalla que lo muestre manda al dueño a
   escribir una dirección que no es nuestra. Se arma por partes para que esta
   misma prueba no se encuentre a sí misma. */
const DOMINIO_AJENO = new RegExp(["mipuesto", "com"].join("\."), "i");

describe("el dominio de MiPuesto", () => {
  it("es mi-puesto.com, con guion", () => {
    expect(DOMINIO_MIPUESTO).toBe("mi-puesto.com");
  });

  it("ningún archivo del sistema escribe el dominio ajeno", () => {
    const conDominioAjeno = ["app", "components", "lib"]
      .flatMap((carpeta) => archivos(join(RAIZ, carpeta)))
      .filter((ruta) => DOMINIO_AJENO.test(readFileSync(ruta, "utf8")))
      .map((ruta) => relative(RAIZ, ruta));
    expect(conDominioAjeno).toEqual([]);
  });
});
