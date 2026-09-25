import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = join(import.meta.dirname, "../..");

function hojas(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return hojas(ruta);
    return nombre.endsWith(".css") ? [ruta] : [];
  });
}

/* DESIGN.md §3 y §4: nada de etiquetas en MAYÚSCULAS con letra espaciada, y
   sentence case en toda la interfaz. Se había vuelto un patrón —hasta tenía su
   propio token, `--tracking-etiqueta`— en 22 reglas de 17 hojas: la ficha del
   producto, el formulario del producto, el encabezado del panel, el texto sobre
   la portada. Lo que se escribe con minúscula se lee con minúscula. */
describe("las mayúsculas no son un adorno", () => {
  it("ninguna hoja de estilos convierte el texto a mayúsculas", () => {
    const conMayusculas = ["app", "components"]
      .flatMap((carpeta) => hojas(join(RAIZ, carpeta)))
      .filter((ruta) => /text-transform:\s*uppercase/.test(readFileSync(ruta, "utf8")))
      .map((ruta) => relative(RAIZ, ruta));
    expect(conMayusculas).toEqual([]);
  });
});
