import { describe, expect, it } from "vitest";

import {
  DIAS_DE_AVISO,
  describirDiasRestantes,
  evaluarSuscripcion,
  formatearFechaVencimiento,
} from "./suscripcion";

/* Mediodía en Bolivia (UTC-4) para que las pruebas no dependan de la hora en
   que se ejecutan. */
const AHORA = new Date("2026-09-04T16:00:00Z");

function enDias(dias: number) {
  return new Date(AHORA.getTime() + dias * 24 * 60 * 60 * 1000);
}

describe("evaluarSuscripcion", () => {
  it("está vigente cuando falta más que el aviso", () => {
    const { estado, diasRestantes } = evaluarSuscripcion(enDias(20), AHORA);
    expect(estado).toBe("vigente");
    expect(diasRestantes).toBe(20);
  });

  it("avisa cuando entra en la última semana", () => {
    expect(evaluarSuscripcion(enDias(DIAS_DE_AVISO), AHORA).estado).toBe("por_vencer");
    expect(evaluarSuscripcion(enDias(DIAS_DE_AVISO + 1), AHORA).estado).toBe("vigente");
  });

  it("está vencida cuando la fecha ya pasó", () => {
    expect(evaluarSuscripcion(enDias(-1), AHORA).estado).toBe("vencida");
  });

  it("sigue vigente el mismo día del vencimiento hasta la hora exacta", () => {
    const { estado, diasRestantes } = evaluarSuscripcion(enDias(0.2), AHORA);
    expect(estado).toBe("por_vencer");
    expect(diasRestantes).toBe(0);
  });

  it("acepta la fecha como texto ISO, que es como llega de la base", () => {
    expect(evaluarSuscripcion(enDias(3).toISOString(), AHORA).estado).toBe("por_vencer");
  });

  it("cuenta días de calendario y no bloques de veinticuatro horas", () => {
    // 23:00 en Bolivia; el vencimiento cae a las 01:00 del día siguiente allí,
    // es decir mañana, aunque falten solo dos horas.
    const nocheEnBolivia = new Date("2026-09-05T03:00:00Z");
    const dosHorasDespues = new Date("2026-09-05T05:00:00Z");
    expect(evaluarSuscripcion(dosHorasDespues, nocheEnBolivia).diasRestantes).toBe(1);
  });
});

describe("describirDiasRestantes", () => {
  it("usa palabras y no números para hoy y mañana", () => {
    expect(describirDiasRestantes(0)).toBe("Vence hoy");
    expect(describirDiasRestantes(1)).toBe("Vence mañana");
  });

  it("describe el pasado sin números negativos a la vista", () => {
    expect(describirDiasRestantes(-1)).toBe("Venció ayer");
    expect(describirDiasRestantes(-5)).toBe("Venció hace 5 días");
  });

  it("pluraliza el futuro", () => {
    expect(describirDiasRestantes(12)).toBe("Vence en 12 días");
  });
});

describe("formatearFechaVencimiento", () => {
  it("muestra la fecha en zona boliviana", () => {
    expect(formatearFechaVencimiento(new Date("2026-10-15T02:00:00Z"))).toContain(
      "14 de octubre",
    );
  });
});
