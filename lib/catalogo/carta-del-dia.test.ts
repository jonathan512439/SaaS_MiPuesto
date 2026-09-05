import { describe, expect, it } from "vitest";

import { estaEnLaCartaDeHoy, fechaHoyBolivia } from "./carta-del-dia";

describe("carta del día", () => {
  /* El servidor corre en UTC. Sin el desfase, a las 20:05 de Bolivia ya sería
     el día siguiente y la carta se vaciaría en plena cena. */
  it("usa el día boliviano y no el del servidor", () => {
    expect(fechaHoyBolivia(new Date("2026-03-10T02:00:00.000Z"))).toBe("2026-03-09");
    expect(fechaHoyBolivia(new Date("2026-03-10T03:59:00.000Z"))).toBe("2026-03-09");
    expect(fechaHoyBolivia(new Date("2026-03-10T04:00:00.000Z"))).toBe("2026-03-10");
  });

  it("vence sola a la medianoche boliviana", () => {
    const marcadoElNueve = "2026-03-09";
    expect(estaEnLaCartaDeHoy(marcadoElNueve, new Date("2026-03-10T03:00:00.000Z"))).toBe(true);
    expect(estaEnLaCartaDeHoy(marcadoElNueve, new Date("2026-03-10T05:00:00.000Z"))).toBe(false);
  });

  it("trata el vacío como fuera de la carta", () => {
    expect(estaEnLaCartaDeHoy(null)).toBe(false);
  });
});
