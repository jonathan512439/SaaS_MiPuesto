import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { CIUDADES, esCiudadId, nombreDeCiudad, ordenarCiudades } from "./lugares";

describe("ciudades del directorio", () => {
  /* Igual que con los rubros: si la lista del código y el `check` de la base
     divergen, el panel ofrece una ciudad que la base rechaza al guardar. */
  it("coincide con el check de la migración", () => {
    const sql = readFileSync(
      "supabase/migrations/20260907090000_fase15_etapa7_etiquetas_zona_resenas.sql",
      "utf8",
    );
    const bloque = sql.slice(
      sql.indexOf("negocios_ciudad_valida"),
      sql.indexOf("negocios_zona_corta"),
    );
    const enLaBase = [...bloque.matchAll(/'([a-z_]+)'/g)].map(([, valor]) => valor);
    expect(enLaBase).toEqual([...CIUDADES]);
  });

  it("nombra las ciudades y tolera el vacío", () => {
    expect(nombreDeCiudad("santa_cruz")).toBe("Santa Cruz de la Sierra");
    expect(nombreDeCiudad(null)).toBe("Sin ciudad");
    expect(esCiudadId("beni")).toBe(false);
  });

  /* «Otra ciudad» es un cajón de sastre, no un lugar: encabezar el directorio
     con él sería raro. */
  it("deja «otra» al final", () => {
    expect(ordenarCiudades(["otra", "tarija", "cochabamba"])).toEqual([
      "cochabamba",
      "tarija",
      "otra",
    ]);
  });
});
