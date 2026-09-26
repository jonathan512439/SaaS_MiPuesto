import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ProveedorAvisos } from "../ui";
import { PasoTusProductos } from "./paso-tus-productos";

/* El último paso del alta, con y sin la IA habilitada.
 *
 * Es una combinación que nadie abre a mano: quien prueba el alta suele tener la
 * IA prendida. Sin ella, el camino de la foto llevaba a una pantalla que no
 * existe para ese negocio. Se comprueba qué caminos se ofrecen. */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
}));

function dibujar(conFotoIa: boolean) {
  return renderToString(
    jsx(ProveedorAvisos, {
      children: jsx(PasoTusProductos, { categorias: 4, conFotoIa, productos: 0 }),
    }),
  );
}

describe("PasoTusProductos", () => {
  it("con la IA habilitada ofrece la foto, el Excel y la carga a mano", () => {
    const html = dibujar(true);
    expect(html).toContain("Sácale una foto a tu lista de precios");
    expect(html).toContain("/dashboard/herramientas/desde-foto");
    expect(html).toContain("Sube un Excel");
    expect(html).toContain("Cárgalos a mano");
  });

  it("sin la IA no ofrece la foto, que lo dejaría en una pantalla que no existe", () => {
    const html = dibujar(false);
    expect(html).not.toContain("Sácale una foto a tu lista de precios");
    expect(html).not.toContain("/dashboard/herramientas/desde-foto");
    expect(html).toContain("Sube un Excel");
    expect(html).toContain("Cárgalos a mano");
  });
});
