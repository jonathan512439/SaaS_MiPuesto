import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

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
     el dueño ve un error que no puede entender ni evitar.

     Se recorren **todas** las migraciones y se toma la última restricción, no un
     archivo escrito a mano. Antes esta prueba leía el nombre exacto de la
     migración que creó la columna: el día que se agregue un rubro en una
     migración nueva, seguiría comparando contra la versión vieja y pasaría en
     verde mientras la base dice otra cosa. Eso es exactamente lo que esta prueba
     existe para evitar. */
  it("coincide con el check vigente de la base", () => {
    const carpeta = join(import.meta.dirname, "..", "..", "supabase", "migrations");
    let enLaBase = null;

    for (const archivo of readdirSync(carpeta).filter((n) => n.endsWith(".sql")).sort()) {
      const sql = readFileSync(join(carpeta, archivo), "utf8");
      for (const coincidencia of sql.matchAll(/rubro in \(([^)]*)\)/g)) {
        /* El guion bajo va en la clase: sin él, `tienda_barrio` no coincidiría
           con nada y desaparecería de la lista sin que nada avise. */
        enLaBase = [...coincidencia[1].matchAll(/'([a-z0-9_-]+)'/g)].map(([, valor]) => valor);
      }
    }

    expect(enLaBase, "ninguna migración define la restricción de rubro").not.toBeNull();
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
