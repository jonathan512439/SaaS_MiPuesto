import { describe, expect, it } from "vitest";

import { evaluarHorario, validarHorario, ZONA_HORARIA_NEGOCIO } from "./horario";

const fechaBolivia = (diaHora: string) => new Date(`${diaHora}-04:00`);

describe("validación de horario", () => {
  it("acepta los modos sin horario y siempre abierto", () => {
    expect(validarHorario({ modo: "sin_horario", dias: {} }).correcto).toBe(true);
    expect(validarHorario({ modo: "siempre_abierto", dias: {} }).correcto).toBe(true);
  });

  it("acepta varios intervalos y el formato heredado del seed", () => {
    expect(
      validarHorario({
        modo: "programado",
        dias: {
          lunes: [
            { abre: "08:00", cierra: "12:00" },
            { abre: "14:00", cierra: "18:00" },
          ],
        },
      }).correcto,
    ).toBe(true);
    expect(validarHorario({ lunes: { abre: "08:00", cierra: "18:00" } }).correcto).toBe(
      true,
    );
  });

  it.each([
    { modo: "desconocido", dias: {} },
    { modo: "programado", dias: { lunes: [{ abre: "25:00", cierra: "18:00" }] } },
    { modo: "programado", dias: { lunes: [{ abre: "08:00", cierra: "08:00" }] } },
    {
      modo: "programado",
      dias: {
        lunes: [
          { abre: "08:00", cierra: "12:00" },
          { abre: "11:30", cierra: "13:00" },
        ],
      },
    },
    {
      modo: "programado",
      dias: {
        lunes: [{ abre: "22:00", cierra: "02:00" }],
        martes: [{ abre: "01:00", cierra: "03:00" }],
      },
    },
    {
      modo: "programado",
      dias: {
        lunes: [
          { abre: "08:00", cierra: "09:00" },
          { abre: "10:00", cierra: "11:00" },
          { abre: "12:00", cierra: "13:00" },
          { abre: "14:00", cierra: "15:00" },
        ],
      },
    },
  ])("rechaza horarios inválidos", (horario) => {
    expect(validarHorario(horario).correcto).toBe(false);
  });
});

describe("estado de atención", () => {
  const horarioLunes = {
    modo: "programado",
    dias: { lunes: [{ abre: "09:00", cierra: "18:00" }] },
  };

  it("usa la zona horaria de Bolivia", () => {
    expect(ZONA_HORARIA_NEGOCIO).toBe("America/La_Paz");
    expect(evaluarHorario(horarioLunes, new Date("2026-09-07T13:00:00Z")).abierto).toBe(true);
  });

  it("considera la apertura inclusiva y el cierre exclusivo", () => {
    expect(evaluarHorario(horarioLunes, fechaBolivia("2026-09-07T09:00:00")).abierto).toBe(
      true,
    );
    expect(evaluarHorario(horarioLunes, fechaBolivia("2026-09-07T17:59:00")).abierto).toBe(
      true,
    );
    expect(evaluarHorario(horarioLunes, fechaBolivia("2026-09-07T18:00:00")).abierto).toBe(
      false,
    );
  });

  it("cambia correctamente de día", () => {
    expect(evaluarHorario(horarioLunes, fechaBolivia("2026-09-07T23:59:00")).abierto).toBe(
      false,
    );
    expect(evaluarHorario(horarioLunes, fechaBolivia("2026-09-08T09:00:00")).abierto).toBe(
      false,
    );
  });

  it("resume el horario de hoy cuando el negocio está cerrado", () => {
    expect(evaluarHorario(horarioLunes, fechaBolivia("2026-09-07T08:00:00"))).toMatchObject({
      texto: "Cerrado · Abre hoy a las 09:00",
      horarioBreve: "Hoy: 09:00–18:00.",
    });
  });

  it("informa la próxima atención cuando hoy está cerrado", () => {
    expect(evaluarHorario(horarioLunes, fechaBolivia("2026-09-06T12:00:00"))).toMatchObject({
      texto: "Cerrado · Abre el lunes a las 09:00",
      horarioBreve: "Próxima atención: lunes 09:00–18:00.",
    });
  });

  it("informa la hora de cierre mientras está abierto", () => {
    expect(evaluarHorario(horarioLunes, fechaBolivia("2026-09-07T12:00:00")).texto).toBe(
      "Abierto ahora · Cierra a las 18:00",
    );
  });

  it("mantiene abierto un intervalo que cruza medianoche", () => {
    const horarioNocturno = {
      modo: "programado",
      dias: { viernes: [{ abre: "22:00", cierra: "02:00" }] },
    };
    expect(
      evaluarHorario(horarioNocturno, fechaBolivia("2026-09-11T23:30:00")).abierto,
    ).toBe(true);
    expect(
      evaluarHorario(horarioNocturno, fechaBolivia("2026-09-11T23:30:00")).texto,
    ).toBe("Abierto ahora · Cierra a las 02:00");
    expect(
      evaluarHorario(horarioNocturno, fechaBolivia("2026-09-12T01:59:00")).abierto,
    ).toBe(true);
    expect(
      evaluarHorario(horarioNocturno, fechaBolivia("2026-09-12T02:00:00")).abierto,
    ).toBe(false);
  });

  it("no restringe sin horario y mantiene disponible siempre abierto", () => {
    expect(evaluarHorario({ modo: "sin_horario", dias: {} })).toMatchObject({
      abierto: null,
      permiteAcciones: true,
      aviso: null,
    });
    expect(evaluarHorario({ modo: "siempre_abierto", dias: {} })).toMatchObject({
      abierto: true,
      permiteAcciones: true,
      texto: "Siempre abierto",
    });
  });

  it("falla de forma segura cuando el horario programado es inválido", () => {
    expect(evaluarHorario({ modo: "programado", dias: { lunes: [{ abre: "x", cierra: "y" }] } })).toMatchObject({
      abierto: false,
      permiteAcciones: false,
    });
  });
});
