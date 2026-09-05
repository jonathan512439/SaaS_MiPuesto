import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { DEFINICIONES_RUBROS, RUBROS, esRubroId, nombreDeRubro, rubroOfrece } from "./rubros";

describe("rubros de negocio", () => {
  /* El check de la base y esta lista tienen que decir lo mismo: si divergen, el
     panel ofrece un rubro que la base rechaza al guardar. */
  it("define exactamente los rubros declarados", () => {
    expect(DEFINICIONES_RUBROS.map(({ id }) => id)).toEqual([...RUBROS]);
    expect(new Set(DEFINICIONES_RUBROS.map(({ nombre }) => nombre)).size).toBe(RUBROS.length);
  });

  /* La lista de arriba y el `check` de la base tienen que decir lo mismo: si
     divergen, el panel ofrece un rubro que la base rechaza recién al guardar, y
     el dueño ve un error que no puede entender ni evitar. */
  it("coincide con el check de la migración", () => {
    const sql = readFileSync(
      "supabase/migrations/20260906200000_fase14_rubro_y_carta.sql",
      "utf8",
    );
    const bloque = sql.slice(sql.indexOf("negocios_rubro_valido"), sql.indexOf("comment on"));
    const enLaBase = [...bloque.matchAll(/'([a-z_]+)'/g)].map(([, valor]) => valor);
    expect(enLaBase).toEqual([...RUBROS]);
  });

  it("reconoce solo los rubros válidos", () => {
    expect(esRubroId("restaurante")).toBe(true);
    expect(esRubroId("panaderia")).toBe(false);
    expect(esRubroId(null)).toBe(false);
  });

  /* Quien nunca eligió rubro ve el panel completo: quitarle pantallas que hoy
     usa sería castigarlo por no contestar una pregunta que nunca se le hizo. */
  it("ofrece todo a quien no eligió rubro", () => {
    expect(rubroOfrece(null, "carta_del_dia")).toBe(true);
    expect(rubroOfrece("", "menu_imprimible")).toBe(true);
  });

  it("apaga las funciones que no le sirven al rubro", () => {
    expect(rubroOfrece("restaurante", "carta_del_dia")).toBe(true);
    expect(rubroOfrece("belleza", "carta_del_dia")).toBe(false);
    expect(rubroOfrece("ferreteria", "menu_imprimible")).toBe(true);
    expect(rubroOfrece("ropa_y_calzado", "menu_imprimible")).toBe(false);
  });

  it("nombra el rubro para las pantallas", () => {
    expect(nombreDeRubro("ferreteria")).toBe("Ferretería y materiales");
    expect(nombreDeRubro(null)).toBe("Sin definir");
  });
});
