import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/* Toda ruta que llama al modelo reserva antes una lectura del cupo.
 *
 * `prepararLecturaDeFoto` es el único control de gasto: sesión, clave, función
 * habilitada para el negocio y cupo del plan. Una ruta que llamara a
 * `analizarArchivo` sin pasar por ahí dejaría a cualquier sesión gastar la cuota
 * de Google sin tope. Eran dos rutas y se sumó una tercera —las descripciones
 * de una planilla—; la cuarta puede olvidarse, y esta prueba es la que no. */
const RAIZ = join(import.meta.dirname, "..", "..");

function rutas(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return rutas(ruta);
    return nombre === "route.ts" ? [ruta] : [];
  });
}

describe("las rutas que llaman al modelo", () => {
  const conModelo = rutas(join(RAIZ, "app", "api")).filter((ruta) =>
    readFileSync(ruta, "utf8").includes("analizarArchivo"),
  );

  it("existen, y la prueba las encuentra", () => {
    expect(conModelo.length).toBeGreaterThanOrEqual(3);
  });

  it("reservan la lectura antes de llamar al modelo", () => {
    for (const ruta of conModelo) {
      const codigo = readFileSync(ruta, "utf8");
      const reserva = codigo.indexOf("await prepararLecturaDeFoto()");
      const llamada = codigo.indexOf("await analizarArchivo");
      const nombre = relative(RAIZ, ruta).replace(/\\/g, "/");
      expect(reserva, `${nombre} no reserva la lectura`).toBeGreaterThan(-1);
      expect(reserva, `${nombre} llama al modelo antes de reservar`).toBeLessThan(llamada);
    }
  });
});
