import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProveedorAvisos, ProveedorConfirmacion } from "../ui";
import { GestorPromociones } from "./gestor-promociones";

/* Fase 14: Promociones no ofrece productos sin precio. Una rebaja sobre nada
   no existe, y la base tampoco la aplicaría (`calcular_precio_producto`). Es
   una pantalla grande del panel, así que también se comprueba que se dibuje. */
function dibujar(productos: Array<{ id: string; nombre: string; precio: number | null }>) {
  const pantalla = jsx(GestorPromociones, {
    negocioNombre: "Ferrovolt",
    categorias: [{ id: "cat-1", nombre: "Ferretería" }],
    productos: productos.map((producto) => ({ ...producto, categoria_id: "cat-1", visible: true })),
    promocionesIniciales: [],
  });
  return renderToString(
    jsx(ProveedorAvisos, { children: jsx(ProveedorConfirmacion, { children: pantalla }) }),
  );
}

describe("Promociones con productos sin precio", () => {
  it("no ofrece el que no tiene precio, y sí el que tiene", () => {
    const html = dibujar([
      { id: "a", nombre: "Placa 1P horizontal 4x2", precio: null },
      { id: "b", nombre: "Interruptor doble", precio: 0 },
      { id: "c", nombre: "Foco LED 9 W", precio: 25 },
    ]);
    expect(html).toContain("Foco LED 9 W");
    expect(html).not.toContain("Placa 1P horizontal 4x2");
    expect(html).not.toContain("Interruptor doble");
  });
});
