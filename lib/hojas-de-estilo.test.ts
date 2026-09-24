import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/* Un byte de control dentro de un `content:` no rompe la compilación ni el lint:
   la hoja se aplica igual y el desperfecto solo se ve en pantalla. Pasó una vez
   —la flecha de «Más opciones» quedó como «be»— y se detectó recién en
   producción, así que se controla acá. */
const RAIZ = join(import.meta.dirname, "..");
const IGNORADAS = new Set(["node_modules", ".next", ".git", "dist", ".vinext"]);

function hojas(directorio: string): string[] {
  return readdirSync(directorio).flatMap((nombre) => {
    if (IGNORADAS.has(nombre)) return [];
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) return hojas(ruta);
    return nombre.endsWith(".css") ? [ruta] : [];
  });
}

describe("hojas de estilo", () => {
  /* Recorre todas las hojas del proyecto: con la suite entera corriendo en
     paralelo pasó los cinco segundos de margen y falló sin motivo. */
  it("no llevan caracteres de control", { timeout: 20_000 }, () => {
    const sucias = hojas(RAIZ).filter((ruta) =>
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(readFileSync(ruta, "utf8")),
    );
    expect(sucias).toEqual([]);
  });
});
