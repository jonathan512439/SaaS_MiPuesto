import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  TOPE_UNIDADES_MAXIMO,
  avisoDeTopeUnidades,
  contarUnidades,
  leerTopeUnidades,
  validarTopeUnidades,
} from "./tope-unidades";

describe("el tope de unidades por pedido", () => {
  it("vacío es «sin tope»: lo que escribe el dueño y lo que llega de la base", () => {
    for (const vacio of ["", "   ", null, undefined]) {
      expect(validarTopeUnidades(vacio)).toEqual({ correcto: true, tope: null });
    }
    expect(leerTopeUnidades(null)).toBeNull();
  });

  it("acepta enteros de 1 al máximo, y nada más", () => {
    expect(validarTopeUnidades("12")).toEqual({ correcto: true, tope: 12 });
    expect(validarTopeUnidades(1)).toEqual({ correcto: true, tope: 1 });
    expect(validarTopeUnidades(String(TOPE_UNIDADES_MAXIMO))).toEqual({
      correcto: true,
      tope: TOPE_UNIDADES_MAXIMO,
    });
    for (const malo of ["0", "-3", "2.5", "1e3", "doce", String(TOPE_UNIDADES_MAXIMO + 1)]) {
      expect(validarTopeUnidades(malo).correcto, malo).toBe(false);
    }
  });

  it("lo que llega de la base fuera de rango se ignora: puede venir de una restauración", () => {
    expect(leerTopeUnidades(0)).toBeNull();
    expect(leerTopeUnidades(2.5)).toBeNull();
    expect(leerTopeUnidades("5")).toBeNull();
    expect(leerTopeUnidades(5)).toBe(5);
  });

  /* El mismo número que el `check` de la columna: si uno cambia y el otro no,
     el panel aceptaría un tope que la base rechaza. */
  it("el máximo es el mismo que el de la base", () => {
    const migracion = readFileSync(
      join(
        import.meta.dirname,
        "../../supabase/migrations/20261028090000_tope_de_unidades_por_pedido.sql",
      ),
      "utf8",
    );
    const enLaBase = /tope_unidades_pedido between 1 and (\d+)/.exec(migracion)?.[1];
    expect(Number(enLaBase)).toBe(TOPE_UNIDADES_MAXIMO);
  });

  it("cuenta unidades, no renglones, y avisa cuántas sobran", () => {
    const unidades = contarUnidades([{ cantidad: 3 }, { cantidad: 3 }]);
    expect(unidades).toBe(6);
    expect(avisoDeTopeUnidades(unidades, null)).toBeNull();
    expect(avisoDeTopeUnidades(unidades, 6)).toBeNull();
    expect(avisoDeTopeUnidades(unidades, 5)).toBe(
      "Este negocio acepta hasta 5 unidades por pedido. Quita 1 para enviarlo.",
    );
    expect(avisoDeTopeUnidades(2, 1)).toContain("hasta 1 unidad por pedido");
  });
});
