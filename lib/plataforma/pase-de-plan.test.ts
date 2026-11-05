import { describe, expect, it } from "vitest";

import { avisoDePaseManual } from "./pase-de-plan";

const VENCE = "2026-11-08T12:00:00Z";

describe("el aviso de sacar un negocio de la prueba a mano", () => {
  it("avisa al pasar de la prueba a un plan pago, con el plan y el vencimiento", () => {
    const aviso = avisoDePaseManual("Mochilas", "prueba", "activo", VENCE);
    expect(aviso?.titulo).toBe("Pasar Mochilas al plan Catálogo Activo sin registrar un pago");
    expect(aviso?.descripcion).toContain("no registra ningún pago");
    expect(aviso?.descripcion).toMatch(/8 de noviembre/);
    expect(aviso?.descripcion).toContain("«Renovar»");
    expect(avisoDePaseManual("Mochilas", "prueba", "catalogo", VENCE)).not.toBeNull();
  });

  it("no avisa entre planes pagos ni al volver a la prueba", () => {
    expect(avisoDePaseManual("Mochilas", "catalogo", "activo", VENCE)).toBeNull();
    expect(avisoDePaseManual("Mochilas", "activo", "catalogo", VENCE)).toBeNull();
    expect(avisoDePaseManual("Mochilas", "catalogo", "prueba", VENCE)).toBeNull();
    expect(avisoDePaseManual("Mochilas", "prueba", "prueba", VENCE)).toBeNull();
  });
});
