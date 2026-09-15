import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PALETAS } from "../apariencia";
import { DEMOS_POR_RUBRO } from "./demos-rubro";

describe("demostraciones por rubro", () => {
  it("usa colores que el catálogo real sabe publicar", () => {
    for (const demo of DEMOS_POR_RUBRO) {
      expect(PALETAS).toContain(demo.paleta);
    }
    expect(new Set(DEMOS_POR_RUBRO.map(({ id }) => id)).size).toBe(DEMOS_POR_RUBRO.length);
  });

  /* Una foto inventada en la portada es una promesa que el producto no cumple:
     si alguien agrega un rubro y le pone una ruta que no existe, el visitante ve
     un hueco en la única pantalla que decide la venta. */
  it("solo apunta a fotografías que existen en el sitio", () => {
    const rutas = DEMOS_POR_RUBRO.flatMap(({ datos }) =>
      datos.categorias
        .flatMap(({ productos }) => productos)
        .flatMap(({ imagenes }) => imagenes.map(({ src }) => src)),
    );

    expect(rutas.length).toBeGreaterThan(0);
    for (const ruta of rutas) {
      expect(existsSync(join(process.cwd(), "public", ruta))).toBe(true);
    }
  });

  it("muestra precios y textos utilizables en cada rubro", () => {
    for (const demo of DEMOS_POR_RUBRO) {
      const productos = demo.datos.categorias.flatMap((c) => c.productos);
      expect(productos.length).toBeGreaterThanOrEqual(3);
      expect(productos.every(({ precio }) => precio > 0)).toBe(true);
      expect(demo.gancho.length).toBeGreaterThan(0);
      expect(demo.datos.negocio.nombre.length).toBeGreaterThan(0);
    }
  });
});
