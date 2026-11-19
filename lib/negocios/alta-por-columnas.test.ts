import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { validarDatosNegocio } from "./validacion";

/* El dueño da de alta su negocio con unas columnas contadas, y la base no le
 * deja poner ninguna más (`20261119090000_el_dueno_no_elige_su_plan.sql`).
 *
 * Hasta el 2026-11-15 el permiso de insertar era sobre la tabla entera: con su
 * sesión, un dueño creaba su negocio con el plan Activo, vencimiento en 2099,
 * publicado y verificado. Ahora el permiso es por columna, y eso tiene el filo
 * de siempre: **una columna que el alta empiece a mandar no queda concedida
 * sola**, y el alta fallaría con un «no se pudo guardar» que no dice por qué.
 *
 * Esta prueba compara los dos lados sin base: lo que arma la ruta y lo que
 * concede la migración. La base de verdad la mira `npm run test:permisos:linked`. */
const RAIZ = join(import.meta.dirname, "..", "..");
const MIGRACIONES = join(RAIZ, "supabase", "migrations");

/* La última migración que concede `insert` por columnas sobre `negocios`. */
function columnasConcedidas(): string[] {
  const patron = /grant insert \(([^)]+)\)\s+on table public\.negocios to authenticated/gi;
  let ultima: string[] = [];
  for (const archivo of readdirSync(MIGRACIONES).sort()) {
    const sql = readFileSync(join(MIGRACIONES, archivo), "utf8").replace(/--.*$/gm, "");
    for (const [, lista] of sql.matchAll(patron)) {
      ultima = lista.split(",").map((columna) => columna.trim());
    }
  }
  return ultima.sort();
}

describe("el alta de un negocio, columna por columna", () => {
  const validacion = validarDatosNegocio({
    nombre: "Ferretería El Sol",
    slug: "ferreteria-el-sol",
    descripcion: "Todo para la obra",
    subnombre: "Desde 1998",
    tipo_negocio: "tienda_virtual",
    telefono_whatsapp: "70000001",
    rubro: "",
    pide_numero_mesa: false,
  });

  it("el ejemplo es un alta válida", () => {
    expect(validacion.correcto).toBe(true);
  });

  it("la base concede exactamente las columnas que manda la ruta", () => {
    if (!validacion.correcto) throw new Error("el ejemplo dejó de ser válido");
    /* La ruta inserta lo validado más el dueño de la sesión. */
    const queMandaLaRuta = [...Object.keys(validacion.datos), "admin_user_id"].sort();
    expect(columnasConcedidas()).toEqual(queMandaLaRuta);
  });

  it("la ruta sigue insertando lo validado y nada que venga del navegador", () => {
    const ruta = readFileSync(join(RAIZ, "app", "api", "negocios", "perfil", "route.ts"), "utf8");
    expect(ruta).toMatch(/\.insert\(\{ \.\.\.datos, admin_user_id: idUsuario \}\)/);
    expect(ruta).toMatch(/const datos = \{ \.\.\.validacion\.datos \}/);
  });

  /* Lo que decide la plataforma. Si alguna vez una migración le concede al
     dueño insertar una de estas, falla acá y no en producción. */
  it("ninguna columna de la plataforma se puede poner al dar de alta", () => {
    const concedidas = new Set(columnasConcedidas());
    for (const columna of [
      "plan_id",
      "suscripcion_vence_en",
      "activo",
      "verificado",
      "suspendido_en",
      "foto_ia_habilitada",
    ]) {
      expect(concedidas.has(columna), columna).toBe(false);
    }
  });

  it("ninguna migración posterior le devuelve al dueño insertar o borrar sobre la tabla entera", () => {
    let desde = false;
    for (const archivo of readdirSync(MIGRACIONES).sort()) {
      const sql = readFileSync(join(MIGRACIONES, archivo), "utf8").replace(/--.*$/gm, "");
      if (/revoke insert, delete on table public\.negocios from authenticated/i.test(sql)) {
        desde = true;
        continue;
      }
      if (!desde) continue;
      expect(sql, archivo).not.toMatch(
        /grant\s+(?:all|[a-z, ]*\b(?:insert|delete)\b[a-z, ]*)\s+on (?:table )?public\.negocios\s+to[^;]*\bauthenticated\b/i,
      );
    }
    expect(desde, "falta la migración que quita el permiso sobre la tabla entera").toBe(true);
  });
});
