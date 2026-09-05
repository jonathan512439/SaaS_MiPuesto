import { describe, expect, it } from "vitest";

import {
  evaluarHorario,
  MAXIMO_EXCEPCIONES,
  validarHorario,
  ZONA_HORARIA_NEGOCIO,
} from "./horario";

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

  /* Cuando la próxima apertura es el día siguiente se dice «mañana» y no el
     nombre del día: nombrarlo obliga a quien lee a calcular en qué día está. */
  it("informa la próxima atención cuando hoy está cerrado", () => {
    expect(evaluarHorario(horarioLunes, fechaBolivia("2026-09-06T12:00:00"))).toMatchObject({
      texto: "Cerrado · Abre mañana a las 09:00",
      horarioBreve: "Próxima atención: mañana 09:00–18:00.",
    });
  });

  it("nombra el día cuando la próxima apertura no es mañana", () => {
    expect(evaluarHorario(horarioLunes, fechaBolivia("2026-09-08T12:00:00"))).toMatchObject({
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

describe("fechas especiales y feriados", () => {
  const horarioLunes = {
    modo: "programado",
    dias: { lunes: [{ abre: "09:00", cierra: "18:00" }] },
  };

  it("acepta una fecha cerrada y una con horario propio", () => {
    expect(
      validarHorario({
        ...horarioLunes,
        excepciones: [
          { fecha: "2026-08-06", cerrado: true, motivo: "Día de la Patria" },
          {
            fecha: "2026-12-24",
            cerrado: false,
            intervalos: [{ abre: "09:00", cierra: "13:00" }],
            motivo: "Nochebuena",
          },
        ],
      }).correcto,
    ).toBe(true);
  });

  it.each([
    [{ fecha: "2026-02-30", cerrado: true }],
    [{ fecha: "06-08-2026", cerrado: true }],
    [{ fecha: "2026-08-06", cerrado: false, intervalos: [] }],
    [
      {
        fecha: "2026-08-06",
        cerrado: false,
        intervalos: [
          { abre: "09:00", cierra: "13:00" },
          { abre: "12:00", cierra: "15:00" },
        ],
      },
    ],
  ])("rechaza una fecha especial inválida: %o", (excepcion) => {
    expect(
      validarHorario({ ...horarioLunes, excepciones: [excepcion] }).correcto,
    ).toBe(false);
  });

  it("rechaza fechas repetidas", () => {
    expect(
      validarHorario({
        ...horarioLunes,
        excepciones: [
          { fecha: "2026-08-06", cerrado: true },
          { fecha: "2026-08-06", cerrado: true },
        ],
      }).correcto,
    ).toBe(false);
  });

  it("rechaza más excepciones que el máximo", () => {
    const excepciones = Array.from({ length: MAXIMO_EXCEPCIONES + 1 }, (_, indice) => ({
      fecha: `2026-08-${String(indice + 1).padStart(2, "0")}`,
      cerrado: true,
    }));
    expect(validarHorario({ ...horarioLunes, excepciones }).correcto).toBe(false);
  });

  it("cierra un lunes feriado que de otro modo estaría abierto", () => {
    const conFeriado = {
      ...horarioLunes,
      excepciones: [{ fecha: "2026-09-07", cerrado: true, motivo: "Feriado" }],
    };
    expect(evaluarHorario(horarioLunes, fechaBolivia("2026-09-07T12:00:00")).abierto).toBe(
      true,
    );
    expect(evaluarHorario(conFeriado, fechaBolivia("2026-09-07T12:00:00"))).toMatchObject({
      abierto: false,
      permiteAcciones: false,
      texto: "Cerrado hoy · Feriado",
    });
  });

  it("aplica el horario propio de una fecha especial", () => {
    const conMediaJornada = {
      ...horarioLunes,
      excepciones: [
        {
          fecha: "2026-09-07",
          cerrado: false,
          intervalos: [{ abre: "09:00", cierra: "13:00" }],
          motivo: "Media jornada",
        },
      ],
    };
    expect(
      evaluarHorario(conMediaJornada, fechaBolivia("2026-09-07T12:00:00")).texto,
    ).toBe("Abierto ahora · Cierra a las 13:00");
    expect(
      evaluarHorario(conMediaJornada, fechaBolivia("2026-09-07T14:00:00")).abierto,
    ).toBe(false);
  });

  it("abre en una fecha especial aunque ese día de la semana esté cerrado", () => {
    const conDomingo = {
      ...horarioLunes,
      excepciones: [
        {
          fecha: "2026-09-06",
          cerrado: false,
          intervalos: [{ abre: "10:00", cierra: "14:00" }],
        },
      ],
    };
    expect(evaluarHorario(horarioLunes, fechaBolivia("2026-09-06T11:00:00")).abierto).toBe(
      false,
    );
    expect(evaluarHorario(conDomingo, fechaBolivia("2026-09-06T11:00:00")).abierto).toBe(
      true,
    );
  });

  it("cierra un feriado incluso con siempre abierto", () => {
    const siempre = {
      modo: "siempre_abierto",
      dias: {},
      excepciones: [{ fecha: "2026-09-07", cerrado: true, motivo: "Feriado" }],
    };
    expect(evaluarHorario(siempre, fechaBolivia("2026-09-06T12:00:00"))).toMatchObject({
      abierto: true,
      texto: "Siempre abierto",
    });
    expect(evaluarHorario(siempre, fechaBolivia("2026-09-07T12:00:00"))).toMatchObject({
      abierto: false,
      permiteAcciones: false,
      texto: "Cerrado hoy · Feriado",
    });
  });

  it("no deja que una excepción rompa el intervalo que cruza la medianoche", () => {
    const nocturno = {
      modo: "programado",
      dias: { viernes: [{ abre: "22:00", cierra: "02:00" }] },
      excepciones: [{ fecha: "2026-09-12", cerrado: true, motivo: "Cerrado el sábado" }],
    };
    /* El viernes abrió antes de medianoche: el sábado cerrado no corta un turno
       que ya venía en curso. */
    expect(evaluarHorario(nocturno, fechaBolivia("2026-09-12T01:00:00")).abierto).toBe(
      true,
    );
  });
});
