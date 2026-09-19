import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { RUTAS_MUDADAS, RUTAS_PANEL } from "./rutas";

/* Las direcciones del panel se escribían a mano en veinticuatro sitios.
 *
 * Esta prueba no comprueba que las direcciones sean correctas: comprueba que
 * **no haya direcciones sueltas**. Una escrita a mano funciona perfecto hasta el
 * día que la pantalla cambia de nombre, y ese día falla en silencio —el enlace
 * sigue existiendo, solo que ya no lleva a ninguna parte—, que es la clase de
 * falla que nadie encuentra hasta que la reporta un cliente. */
const RAIZ = join(import.meta.dirname, "..", "..");
const CARPETAS = ["app", "components", "lib"];
/* Acá viven las direcciones de verdad; es el único sitio donde tiene que
   haberlas. */
const MODULO = join(RAIZ, "lib", "panel", "rutas.ts");

function archivosDeCodigo(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivosDeCodigo(ruta);
    return /\.tsx?$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) ? [ruta] : [];
  });
}

describe("las direcciones del panel", () => {
  it("no se escriben a mano en ninguna otra parte", () => {
    /* Una cadena que empieza con `/dashboard`. Las rutas de los módulos de
       estilo también nombran la carpeta —`../../app/(admin)/dashboard/…`— pero
       empiezan con puntos, así que no entran acá. */
    /* Termine en comillas, en `?` o en `#`: una dirección con parámetros es
       una dirección igual. Por ese hueco pasó `"/dashboard/catalogo?asistente=foto"`,
       que llevaba a una pantalla que no leía el parámetro, y dos botones del alta
       no hicieron nada durante semanas. */
    const sueltas = /"\/dashboard(\/[a-z0-9-]+)*[?#"]/;
    const culpables = CARPETAS.flatMap((c) => archivosDeCodigo(join(RAIZ, c)))
      .filter((ruta) => ruta !== MODULO)
      .filter((ruta) => sueltas.test(readFileSync(ruta, "utf8")))
      .map((ruta) => relative(RAIZ, ruta));

    expect(culpables).toEqual([]);
  });

  it("las que se mudaron siguen teniendo a dónde llegar", () => {
    /* Sin el archivo de redirección, la dirección vieja da 404. Se comprueba que
       el archivo exista y que mande a la nueva: un `page.tsx` que se olvidó de
       redirigir es una pantalla en blanco, que es peor que el 404. */
    for (const { vieja, nueva } of RUTAS_MUDADAS) {
      const pagina = join(RAIZ, "app", "(admin)", ...vieja.split("/").filter(Boolean), "page.tsx");
      expect(existsSync(pagina), `falta la redirección de ${vieja}`).toBe(true);

      const codigo = readFileSync(pagina, "utf8");
      const clave = Object.entries(RUTAS_PANEL).find(([, valor]) => valor === nueva)?.[0];
      expect(codigo, `${vieja} no redirige a ${nueva}`).toContain(`redirect(RUTAS_PANEL.${clave})`);
    }
  });

  it("no manda a nadie a una pantalla que ya no existe", () => {
    for (const ruta of Object.values(RUTAS_PANEL)) {
      const carpeta = join(RAIZ, "app", "(admin)", ...ruta.split("/").filter(Boolean));
      expect(existsSync(join(carpeta, "page.tsx")), `${ruta} no tiene pantalla`).toBe(true);
    }
  });
});
