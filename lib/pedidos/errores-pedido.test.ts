import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { ERRORES_PEDIDO, responderErrorPedido } from "./errores-pedido";

const RAIZ = join(import.meta.dirname, "..", "..");

/* La definición vigente de `crear_pedido_reservado`: la de la última migración
   que la crea o la reemplaza. */
function funcionVigente(): string {
  const carpeta = join(RAIZ, "supabase", "migrations");
  const marca = "create or replace function public.crear_pedido_reservado(";
  const sql = readdirSync(carpeta)
    .sort()
    .map((archivo) => readFileSync(join(carpeta, archivo), "utf8"))
    .filter((texto) => texto.includes(marca))
    .at(-1)!;
  const inicio = sql.indexOf(marca);
  return sql.slice(inicio, sql.indexOf("\n$$;", inicio));
}

describe("los errores de crear un pedido", () => {
  it("cada código que lanza la función tiene su mensaje en la ruta", () => {
    const codigos = [...funcionVigente().matchAll(/message = '([A-Z_]+)'/g)].map(([, codigo]) => codigo);
    expect(codigos.length).toBeGreaterThan(5);
    for (const codigo of new Set(codigos)) {
      expect(ERRORES_PEDIDO, `falta traducir ${codigo}`).toHaveProperty(codigo);
    }
  });

  it("el nombre es opcional: la función no lo exige", () => {
    const funcion = funcionVigente();
    expect(funcion).not.toMatch(/p_cliente_nombre is null\s+or/);
    expect(funcion).toContain("p_cliente_nombre is not null and char_length(trim(p_cliente_nombre)) > 80");
  });

  it("un código conocido responde su mensaje; uno desconocido, el genérico y anotado", () => {
    expect(responderErrorPedido("STOCK_INSUFICIENTE").estado).toBe(409);
    expect(responderErrorPedido("NOMBRE_INVALIDO")).toEqual({
      estado: 400,
      mensaje: "El nombre admite hasta 80 caracteres.",
    });
    const anotado = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(responderErrorPedido("ALGO_NUEVO").estado).toBe(500);
    expect(anotado).toHaveBeenCalledWith(expect.stringContaining("ALGO_NUEVO"));
    anotado.mockRestore();
  });
});
