import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  COLUMNAS_PRODUCTO_PUBLICO,
  COLUMNAS_PRODUCTO_PUBLICO_FICHA,
  COLUMNAS_PRODUCTO_PUBLICO_PAGINADO,
} from "./columnas";
import { presentacionesDe } from "./pagina-publica";

/* Las tallas de un catálogo grande no se pierden.
 *
 * El catálogo leía **todas** las presentaciones del negocio en una consulta
 * aparte y sin tope. Con el plan más grande —300 productos, hasta 24 cada uno—
 * son 7200 filas, y Supabase devuelve 1000 por omisión: las que quedaban
 * afuera desaparecían del catálogo sin que la petición fallara. Lo encontró la
 * auditoría del 2026-09-30.
 *
 * Ahora viajan **dentro** de la consulta de productos: las de los doce de la
 * página, nunca más de 288. Y si la lectura de los campos falla, el catálogo
 * avisa en vez de dibujarse sin ellos. */
const raiz = join(import.meta.dirname, "..", "..");
const leer = (ruta: string) => readFileSync(join(raiz, ruta), "utf8");
const paginaPublica = leer("lib/catalogo/pagina-publica.ts");
const contexto = paginaPublica.slice(
  paginaPublica.indexOf("export function consultarContextoPublico"),
  paginaPublica.indexOf("export function presentacionesDe"),
);

describe("las presentaciones de la página", () => {
  it("viajan con los productos de la página y de la ficha, no aparte", () => {
    for (const columnas of [COLUMNAS_PRODUCTO_PUBLICO_PAGINADO, COLUMNAS_PRODUCTO_PUBLICO_FICHA]) {
      expect(columnas).toMatch(/variantes_producto\(id,producto_id,nombre,precio,cantidad_stock,cantidad_reservada,visible,orden\)/);
      expect(columnas.startsWith(COLUMNAS_PRODUCTO_PUBLICO)).toBe(true);
    }
    expect(contexto).not.toContain("variantes_producto");
    expect(leer("app/(public)/[slug]/p/[codigo]/page.tsx")).toContain("COLUMNAS_PRODUCTO_PUBLICO_FICHA");
  });

  it("se juntan de todos los productos, aunque alguno no traiga ninguna", () => {
    const talla = (id: string, producto_id: string, orden: number) => ({
      id,
      producto_id,
      nombre: id,
      precio: null,
      cantidad_stock: 1,
      cantidad_reservada: 0,
      visible: true,
      orden,
    });
    expect(
      presentacionesDe([
        { variantes_producto: [talla("M", "polera", 1), talla("S", "polera", 0)] },
        { variantes_producto: [] },
        { variantes_producto: null },
        { variantes_producto: [talla("40", "zapato", 0)] },
      ]).map(({ id }) => id),
    ).toEqual(["M", "S", "40"]);
  });

  it("si la lectura de los campos falla, el catálogo avisa en vez de dibujarse sin ellos", () => {
    expect(leer("app/(public)/[slug]/page.tsx")).toMatch(/resultadoAtributos\.error/);
    expect(leer("app/api/catalogo/[slug]/pagina/route.ts")).toMatch(/atributos\.error/);
    expect(leer("app/(public)/[slug]/p/[codigo]/page.tsx")).toMatch(/atributos\.error/);
  });
});
