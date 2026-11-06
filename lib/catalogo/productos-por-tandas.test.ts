import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { leerDesde, sumarTanda } from "./productos-por-tandas";
import type { ProductoCatalogo } from "./tipos";

const producto = (id: string, nombre = id) => ({ id, nombre }) as ProductoCatalogo;

describe("sumar una tanda de productos", () => {
  it("agrega al final, en el orden en que llegan", () => {
    expect(sumarTanda([producto("a")], [producto("b"), producto("c")]).map(({ id }) => id)).toEqual(["a", "b", "c"]);
  });

  it("no repite, y lo que está en pantalla manda: puede tener una edición más nueva", () => {
    const resultado = sumarTanda([producto("a", "Editado")], [producto("a", "Viejo"), producto("b")]);
    expect(resultado.map(({ nombre }) => nombre)).toEqual(["Editado", "b"]);
  });
});

describe("desde dónde se pide la tanda", () => {
  it("acepta un entero y trata lo demás como el comienzo", () => {
    expect(leerDesde("100")).toBe(100);
    expect(leerDesde(null)).toBe(0);
    expect(leerDesde("-5")).toBe(0);
    expect(leerDesde("1.5")).toBe(0);
    expect(leerDesde("hola")).toBe(0);
  });
});

/* Las dos consultas tienen que ser la misma: si el servidor ordenara la primera
   tanda de otra forma que las siguientes, se perderían productos en silencio. */
describe("la lista del panel", () => {
  it("la primera tanda y las siguientes salen de la misma consulta", () => {
    const leer = (ruta: string) => readFileSync(join(import.meta.dirname, "..", "..", ruta), "utf8");
    expect(leer("lib/catalogo/datos-admin.ts")).toContain("consultarTandaDeProductos(supabase, negocio.id, 0)");
    expect(leer("app/api/catalogo/productos/route.ts")).toContain("consultarTandaDeProductos(");
    expect(leer("lib/catalogo/datos-admin.ts")).not.toContain('.from("productos")');
  });
});
