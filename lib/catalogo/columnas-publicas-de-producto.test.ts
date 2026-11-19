import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  COLUMNAS_CATEGORIA_DE_PRODUCTO,
  COLUMNAS_PRODUCTO_IMPRESO,
  COLUMNAS_PRODUCTO_PUBLICO,
} from "./columnas";

/* Qué lee un visitante de `productos`, columna por columna
 * (`20261120090000_el_visitante_lee_solo_lo_publicado.sql`).
 *
 * Hasta el 2026-11-15 la clave pública leía la tabla entera, también quién
 * cambió cada precio. Ahora el permiso es por columna, con el filo que ya cortó
 * dos veces en `negocios`: **una columna nueva no queda concedida sola**, y
 * pedirla en el catálogo no devuelve la fila sin ella: hace fallar la consulta
 * entera, y ningún catálogo carga.
 *
 * Esta prueba no tiene base, pero ata los tres lugares que tienen que decir lo
 * mismo: los tipos de la base, las migraciones y las consultas del catálogo. Lo
 * que no puede ver —que la base de verdad tenga aplicado lo que dicen las
 * migraciones— lo mira `npm run test:publico:linked`. */
const RAIZ = join(import.meta.dirname, "..", "..");
const MIGRACIONES = join(RAIZ, "supabase", "migrations");

/* El rastro de auditoría de los precios. Agregar una columna acá es decidir
   que el visitante no la lee; no agregarla ni concederla hace fallar la prueba. */
const NO_PUBLICAS = ["precio_actualizado_por", "precio_actualizado_en", "precio_anterior"];

/* Las columnas por las que el catálogo filtra y ordena, además de las que
   muestra: sin permiso sobre ellas la consulta también falla. */
const DE_FILTRO_Y_ORDEN = ["negocio_id", "visible", "eliminado_en", "orden", "creado_en", "texto_busqueda", "codigo"];

function columnasDeLaTabla(): string[] {
  const tipos = readFileSync(join(RAIZ, "lib", "supabase", "database.types.ts"), "utf8");
  const fila = /\n {6}productos: \{\n {8}Row: \{\n([\s\S]*?)\n {8}\}/.exec(tipos)?.[1] ?? "";
  return [...fila.matchAll(/^\s+([a-z_0-9]+)\??:/gm)].map(([, columna]) => columna).sort();
}

/* Desde la migración que quita el permiso sobre la tabla, todo `grant select
   (…) on … productos to anon` suma columnas. */
function columnasConcedidas(): string[] {
  const concedidas = new Set<string>();
  let desde = false;
  for (const archivo of readdirSync(MIGRACIONES).sort()) {
    const sql = readFileSync(join(MIGRACIONES, archivo), "utf8").replace(/--.*$/gm, "");
    if (/revoke select on table public\.productos from anon/i.test(sql)) {
      desde = true;
      concedidas.clear();
    }
    if (!desde) continue;
    /* Nadie le devuelve la tabla entera. */
    expect(sql, archivo).not.toMatch(/grant\s+(?:all|select)\s+on (?:table )?public\.productos\s+to[^;]*\banon\b/i);
    for (const [, lista] of sql.matchAll(/grant select \(([^)]+)\)\s+on (?:table )?public\.productos to[^;]*\banon\b/gi)) {
      for (const columna of lista.split(",")) concedidas.add(columna.trim());
    }
  }
  expect(desde, "falta la migración que quita el permiso sobre la tabla entera").toBe(true);
  return [...concedidas].sort();
}

const separar = (lista: string) => lista.split(",").map((columna) => columna.trim());

describe("lo que un visitante lee de un producto", () => {
  it("la prueba encuentra las columnas de la tabla", () => {
    expect(columnasDeLaTabla().length).toBeGreaterThanOrEqual(28);
    expect(columnasDeLaTabla()).toContain("precio_actualizado_por");
  });

  it("cada columna de la tabla está decidida: la lee el visitante o no", () => {
    const decididas = [...columnasConcedidas(), ...NO_PUBLICAS].sort();
    expect(decididas).toEqual(columnasDeLaTabla());
  });

  it("el rastro de auditoría de los precios no se concede", () => {
    const concedidas = new Set(columnasConcedidas());
    for (const columna of NO_PUBLICAS) expect(concedidas.has(columna), columna).toBe(false);
  });

  it("todo lo que el catálogo pide, filtra u ordena está concedido", () => {
    const concedidas = new Set(columnasConcedidas());
    const pedidas = new Set([
      ...separar(COLUMNAS_PRODUCTO_PUBLICO),
      ...separar(COLUMNAS_PRODUCTO_IMPRESO),
      ...separar(COLUMNAS_CATEGORIA_DE_PRODUCTO),
      ...DE_FILTRO_Y_ORDEN,
    ]);
    for (const columna of pedidas) expect(concedidas.has(columna), columna).toBe(true);
  });

  it("ninguna consulta pública pide el rastro de auditoría", () => {
    for (const lista of [COLUMNAS_PRODUCTO_PUBLICO, COLUMNAS_PRODUCTO_IMPRESO]) {
      for (const columna of NO_PUBLICAS) expect(separar(lista)).not.toContain(columna);
    }
  });
});
