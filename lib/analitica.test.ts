import { describe, expect, it } from "vitest";

import { validarEventoAnalitica } from "./analitica";

const negocioId = "11111111-1111-4111-8111-111111111111";
const sesionId = "22222222-2222-4222-8222-222222222222";
const productoId = "33333333-3333-4333-8333-333333333333";

describe("validación de analítica pública", () => {
  it("acepta una visita sin datos personales", () => {
    expect(validarEventoAnalitica({ negocioId, sesionId, tipo: "vista_catalogo" })).toEqual({
      negocioId,
      sesionId,
      tipo: "vista_catalogo",
      productoId: null,
    });
  });

  it("exige el producto solamente en la interacción de producto", () => {
    expect(
      validarEventoAnalitica({ negocioId, sesionId, tipo: "clic_producto", productoId }),
    ).toMatchObject({ productoId });
    expect(validarEventoAnalitica({ negocioId, sesionId, tipo: "clic_producto" })).toBeNull();
    expect(
      validarEventoAnalitica({ negocioId, sesionId, tipo: "clic_whatsapp", productoId }),
    ).toBeNull();
  });

  it("rechaza identificadores y tipos manipulados", () => {
    expect(validarEventoAnalitica({ negocioId: "otro", sesionId, tipo: "vista_catalogo" })).toBeNull();
    expect(validarEventoAnalitica({ negocioId, sesionId, tipo: "leer_todo" })).toBeNull();
  });
});
