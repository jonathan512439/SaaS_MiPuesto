import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/* Toda ruta de la plataforma pasa por `sesionDePlataforma()`, que exige el
 * segundo factor.
 *
 * Hasta el 2026-10-21 la mitad no lo hacía: pedían sesión y dejaban que la
 * política de la tabla decidiera, y las políticas no pedían el segundo factor.
 * Con la contraseña sola se podía suspender un negocio o mandar una invitación
 * con la clave de servicio. La base ahora también lo exige; esta prueba cuida
 * que la ruta nueva de mañana no vuelva a armar su propia sesión.
 */
const CARPETA = join(import.meta.dirname, "..", "..", "app", "api", "plataforma");

function rutas(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return rutas(ruta);
    return nombre === "route.ts" ? [ruta] : [];
  });
}

describe("las rutas de la plataforma", () => {
  const archivos = rutas(CARPETA);

  it("existen, para que la prueba no pase en vacío", () => {
    expect(archivos.length).toBeGreaterThan(5);
  });

  /* Por manejador y no por archivo: en una ruta con POST y PATCH, que uno solo
     lo pida no alcanza. */
  it("cada manejador exige el segundo factor con sesionDePlataforma()", () => {
    const sinSegundoFactor = archivos
      .filter((archivo) => {
        const codigo = readFileSync(archivo, "utf8");
        const manejadores = (codigo.match(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g) ?? []).length;
        const controles = (codigo.match(/await sesionDePlataforma\(\)/g) ?? []).length;
        return manejadores === 0 || controles < manejadores || codigo.includes("crearClienteSupabaseServidor");
      })
      .map((archivo) => relative(CARPETA, archivo));
    expect(sinSegundoFactor).toEqual([]);
  });
});
