import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  AVISO_DESDE,
  TOPE_ALMACENAMIENTO_BYTES,
  describirEspacio,
  esRechazoPorEspacio,
  nivelDeEspacio,
} from "./almacenamiento";

const MEGA = 1024 * 1024;

describe("el espacio de fotos de cada negocio", () => {
  it("el tope es el mismo que hace cumplir la base", () => {
    const migracion = readFileSync(
      join(import.meta.dirname, "..", "..", "supabase", "migrations", "20261026090000_tope_de_almacenamiento_por_negocio.sql"),
      "utf8",
    );
    const [, megas] = /select \((\d+) \* 1024 \* 1024\)::bigint/.exec(migracion) ?? [];
    expect(Number(megas) * MEGA).toBe(TOPE_ALMACENAMIENTO_BYTES);
  });

  it("avisa desde el 80 % y dice lleno al llegar", () => {
    expect(nivelDeEspacio(5 * MEGA)).toBe("holgado");
    expect(nivelDeEspacio(TOPE_ALMACENAMIENTO_BYTES * AVISO_DESDE)).toBe("poco");
    expect(nivelDeEspacio(TOPE_ALMACENAMIENTO_BYTES - 1)).toBe("poco");
    expect(nivelDeEspacio(TOPE_ALMACENAMIENTO_BYTES)).toBe("lleno");
  });

  it("se dice en megas, como lo entiende un dueño", () => {
    expect(describirEspacio(4.8 * MEGA)).toBe("4,8 MB de 150 MB");
    expect(describirEspacio(120 * MEGA)).toBe("120 MB de 150 MB");
  });

  it("reconoce el rechazo de la regla de la base", () => {
    expect(esRechazoPorEspacio("new row violates row-level security policy")).toBe(true);
    expect(esRechazoPorEspacio("The resource already exists")).toBe(false);
    expect(esRechazoPorEspacio(undefined)).toBe(false);
  });
});
