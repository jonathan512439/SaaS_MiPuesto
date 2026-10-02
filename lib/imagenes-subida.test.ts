import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { PESO_MAXIMO_COMPRIMIDO, subidaDemasiadoGrande } from "./imagenes";

/* Una foto que no entra se rechaza antes de leerla.
 *
 * La ruta convertía el archivo entero en memoria antes de mirar su tamaño, y
 * leer el formulario ya trae la petición completa. El navegador comprime las
 * fotos, pero quien se salte ese paso podía mandar un archivo enorme y gastar
 * la memoria y la CPU del Worker. Lo encontró la auditoría del 2026-09-30. */
describe("subidaDemasiadoGrande", () => {
  it("rechaza por el tamaño anunciado, con margen para el formulario", () => {
    expect(subidaDemasiadoGrande(String(PESO_MAXIMO_COMPRIMIDO + 1024 * 1024))).toBe(true);
    expect(subidaDemasiadoGrande(String(PESO_MAXIMO_COMPRIMIDO))).toBe(false);
    expect(subidaDemasiadoGrande("1500000")).toBe(false);
  });

  it("si no se anuncia el tamaño, no decide: lo mira después el archivo", () => {
    expect(subidaDemasiadoGrande(null)).toBe(false);
    expect(subidaDemasiadoGrande("no es un número")).toBe(false);
  });
});

describe("la ruta de las fotos", () => {
  const ruta = readFileSync(join(import.meta.dirname, "..", "app/api/catalogo/imagenes/route.ts"), "utf8");

  it("mira el tamaño antes de leer el formulario y antes de leer el archivo", () => {
    expect(ruta.indexOf("subidaDemasiadoGrande(")).toBeGreaterThan(-1);
    expect(ruta.indexOf("archivo.size")).toBeGreaterThan(-1);
    expect(ruta.indexOf("subidaDemasiadoGrande(")).toBeLessThan(ruta.indexOf("solicitud.formData()"));
    expect(ruta.indexOf("archivo.size")).toBeLessThan(ruta.indexOf("archivo.arrayBuffer()"));
  });

  it("agrega y quita la referencia en la base, y la quita antes de borrar el archivo", () => {
    expect(ruta).toContain('rpc("agregar_foto_producto"');
    expect(ruta).toContain('rpc("quitar_foto_producto"');
    expect(ruta).not.toMatch(/\.update\(\{ fotos \}\)/);
    const borrar = ruta.slice(ruta.indexOf("export async function DELETE"));
    expect(borrar.indexOf('rpc("quitar_foto_producto"')).toBeLessThan(borrar.indexOf(".remove(["));
  });
});
