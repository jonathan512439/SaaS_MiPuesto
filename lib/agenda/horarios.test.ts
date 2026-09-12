import { describe, expect, it } from "vitest";

import {
  describirCita,
  horarioValido,
  horariosDelDia,
  proximosDias,
  rangoDeCita,
  type Agenda,
} from "./horarios";

/* Todas las pruebas pasan la fecha como parámetro. No hay relojes simulados ni
   esperas: el turno de las 23:30, el feriado y la anticipación mínima se
   comprueban eligiendo el instante, que es la razón por la que esta función es
   pura. */

const LUNES = "2026-09-14"; // lunes
const DOMINGO = "2026-09-20";

/* Medianoche del domingo anterior, en Bolivia. Lo bastante lejos de cualquier
   horario de estas pruebas como para que la anticipación no moleste. */
const ANTES = new Date("2026-09-13T04:00:00Z");

function agenda(parcial: Partial<Agenda> = {}): Agenda {
  return {
    duracionMinutos: 30,
    cupoPorFranja: 1,
    anticipacionMinimaHoras: 0,
    diasMaximos: 30,
    franjas: [
      { dia: 1, desde: "08:30", hasta: "10:00" },
      { dia: 6, desde: "09:00", hasta: "10:00" },
    ],
    ...parcial,
  };
}

describe("horariosDelDia", () => {
  it("parte el tramo en turnos de la duración pedida", () => {
    const horarios = horariosDelDia(agenda(), LUNES, [], ANTES);
    expect(horarios.map(({ hora }) => hora)).toEqual(["08:30", "09:00", "09:30"]);
  });

  /* Bolivia está cuatro horas detrás de UTC. Las 08:30 de allá son las 12:30 de
     acá, y si esto se rompe los horarios saltan de día. */
  it("el instante lleva la zona del negocio", () => {
    expect(horariosDelDia(agenda(), LUNES, [], ANTES)[0].inicio).toBe("2026-09-14T12:30:00.000Z");
  });

  it("un día sin tramos no tiene horarios", () => {
    expect(horariosDelDia(agenda(), DOMINGO, [], ANTES)).toEqual([]);
  });

  /* Con un tramo de 8:30 a 10:00 y turnos de 50 minutos entra uno solo: el
     segundo terminaría a las 10:10, con el negocio ya cerrado. */
  it("no genera un turno que se pasa del cierre", () => {
    const horarios = horariosDelDia(agenda({ duracionMinutos: 50 }), LUNES, [], ANTES);
    expect(horarios.map(({ hora }) => hora)).toEqual(["08:30"]);
  });

  it("junta y ordena los tramos de un mismo día", () => {
    const conDos = agenda({
      franjas: [
        { dia: 1, desde: "14:30", hasta: "15:30" },
        { dia: 1, desde: "08:30", hasta: "09:30" },
      ],
    });
    expect(horariosDelDia(conDos, LUNES, [], ANTES).map(({ hora }) => hora)).toEqual([
      "08:30",
      "09:00",
      "14:30",
      "15:00",
    ]);
  });

  describe("los lugares libres", () => {
    /* Una cita de 08:30 a 09:00, en el cupo 1. */
    const ocupa = (desde: string, hasta: string, cupo = 1) => ({
      inicio: `2026-09-14T${desde}:00.000Z`,
      fin: `2026-09-14T${hasta}:00.000Z`,
      cupo,
    });

    it("descuenta el cupo ocupado y deja libres los demás", () => {
      const horarios = horariosDelDia(
        agenda({ cupoPorFranja: 2 }),
        LUNES,
        [ocupa("12:30", "13:00")],
        ANTES,
      );
      expect(horarios[0].libres).toBe(1);
      expect(horarios[1].libres).toBe(2);
    });

    /* Se devuelve con cero y **no se omite**: omitirlo haría parecer que el
       negocio no atiende a esa hora, cuando lo que pasa es que ya la tomaron.
       Son dos cosas distintas y el cliente merece saber cuál es. */
    it("la franja llena sale igual, con cero", () => {
      const horarios = horariosDelDia(agenda(), LUNES, [ocupa("12:30", "13:00")], ANTES);
      expect(horarios[0]).toMatchObject({ hora: "08:30", libres: 0 });
      expect(horarios).toHaveLength(3);
    });

    /* **El caso que originó este cambio.** Un consultorio con un solo
       profesional y cinco servicios: alguien toma una valoración de 10:00 a
       11:00, y la vacunación de quince minutos no puede ofrecer 10:00, 10:15,
       10:30 ni 10:45. Antes las ofrecía, porque el choque se medía por producto
       y eran productos distintos. */
    it("una cita larga de otro servicio tapa todos los turnos que pisa", () => {
      const vacunacion = agenda({
        duracionMinutos: 15,
        franjas: [{ dia: 1, desde: "10:00", hasta: "11:30" }],
      });
      const valoracion = [
        { inicio: "2026-09-14T14:00:00.000Z", fin: "2026-09-14T15:00:00.000Z", cupo: 1 },
      ];
      const horarios = horariosDelDia(vacunacion, LUNES, valoracion, ANTES);
      const libres = horarios.filter((horario) => horario.libres > 0).map(({ hora }) => hora);
      expect(libres).toEqual(["11:00", "11:15"]);
    });

    /* Dos citas del mismo cupo que pisan el mismo turno ocupan **un** lugar, no
       dos: la misma persona no puede estar en dos citas a la vez. */
    it("no cuenta dos veces el mismo cupo", () => {
      const horarios = horariosDelDia(
        agenda({ cupoPorFranja: 2, duracionMinutos: 60, franjas: [{ dia: 1, desde: "08:00", hasta: "09:00" }] }),
        LUNES,
        [ocupa("12:00", "12:30"), ocupa("12:30", "13:00")],
        ANTES,
      );
      expect(horarios[0].libres).toBe(1);
    });

    /* Tocarse no es pisarse: una cita que termina a las 09:00 no ocupa el turno
       que empieza a las 09:00. Sin esto se perdería un turno por cada cita. */
    it("una cita que termina justo cuando empieza el turno no lo ocupa", () => {
      const horarios = horariosDelDia(agenda(), LUNES, [ocupa("12:30", "13:00")], ANTES);
      expect(horarios[1]).toMatchObject({ hora: "09:00", libres: 1 });
    });

    it("nunca devuelve libres negativos aunque la ocupación venga de más", () => {
      const horarios = horariosDelDia(
        agenda(),
        LUNES,
        [ocupa("12:30", "13:00", 1), ocupa("12:30", "13:00", 2)],
        ANTES,
      );
      expect(horarios[0].libres).toBe(0);
    });
  });

  describe("la anticipación mínima", () => {
    /* Sin esto alguien reserva a las 9:58 para las 10:00 y el negocio se entera
       cuando la persona ya está en la puerta. */
    it("esconde lo que ya no se puede pedir", () => {
      /* Lunes 07:30 en Bolivia, con dos horas de anticipación: el corte queda en
         las 09:30, así que el de 08:30 y el de 09:00 ya no se ofrecen y el de
         09:30 entra justo. */
      const ahora = new Date("2026-09-14T11:30:00Z");
      const horarios = horariosDelDia(agenda({ anticipacionMinimaHoras: 2 }), LUNES, [], ahora);
      expect(horarios.map(({ hora }) => hora)).toEqual(["09:30"]);
    });

    it("en cero se ofrece todo lo que todavía no pasó", () => {
      const ahora = new Date("2026-09-14T12:45:00Z"); // 08:45 en Bolivia
      const horarios = horariosDelDia(agenda(), LUNES, [], ahora);
      expect(horarios.map(({ hora }) => hora)).toEqual(["09:00", "09:30"]);
    });
  });

  it("una duración imposible no rompe, devuelve nada", () => {
    expect(horariosDelDia(agenda({ duracionMinutos: 0 }), LUNES, [], ANTES)).toEqual([]);
  });

  /* El turno de la noche: un tramo que llega hasta las 23:30 tiene que caer en
     el mismo día, no en el siguiente. Es el caso donde un error de zona se ve. */
  it("un turno de la noche no se pasa al día siguiente", () => {
    const nocturna = agenda({ franjas: [{ dia: 1, desde: "23:00", hasta: "23:30" }] });
    const horarios = horariosDelDia(nocturna, LUNES, [], ANTES);
    expect(horarios).toHaveLength(1);
    expect(horarios[0].inicio).toBe("2026-09-15T03:00:00.000Z");
    expect(describirCita(horarios[0].inicio)).toContain("Lunes 14");
  });
});

describe("proximosDias", () => {
  it("devuelve solo los días que tienen turnos", () => {
    const dias = proximosDias(agenda(), [], ANTES, 5);
    expect(dias.map(({ fecha }) => fecha)).toEqual([
      "2026-09-14",
      "2026-09-19",
      "2026-09-21",
      "2026-09-26",
      "2026-09-28",
    ]);
  });

  it("no mira más allá de los días máximos", () => {
    const corta = agenda({ diasMaximos: 3 });
    expect(proximosDias(corta, [], ANTES).map(({ fecha }) => fecha)).toEqual(["2026-09-14"]);
  });

  it("una agenda sin tramos no ofrece nada", () => {
    expect(proximosDias(agenda({ franjas: [] }), [], ANTES)).toEqual([]);
  });
});

describe("horarioValido", () => {
  /* Es lo que impide que una petición armada a mano reserve las 3 de la mañana
     de un domingo: la restricción de exclusión la aceptaría sin chistar, porque
     no choca con ninguna otra cita. */
  it("acepta un comienzo que cae en la agenda", () => {
    expect(horarioValido(agenda(), "2026-09-14T12:30:00.000Z", ANTES)).toBe(true);
  });

  it("rechaza una hora que no está en ningún tramo", () => {
    expect(horarioValido(agenda(), "2026-09-14T07:00:00.000Z", ANTES)).toBe(false);
  });

  it("rechaza un día en el que no se atiende", () => {
    expect(horarioValido(agenda(), "2026-09-20T13:00:00.000Z", ANTES)).toBe(false);
  });

  it("rechaza un comienzo que no cae en la grilla", () => {
    expect(horarioValido(agenda(), "2026-09-14T12:45:00.000Z", ANTES)).toBe(false);
  });

  it("rechaza el pasado y lo que se pasa del tope de días", () => {
    expect(horarioValido(agenda(), "2026-09-07T12:30:00.000Z", ANTES)).toBe(false);
    expect(horarioValido(agenda({ diasMaximos: 1 }), "2026-09-19T13:00:00.000Z", ANTES)).toBe(
      false,
    );
  });

  it("no rompe con una fecha que no se puede leer", () => {
    expect(horarioValido(agenda(), "el sábado", ANTES)).toBe(false);
  });
});

describe("rangoDeCita", () => {
  it("el fin sale de la duración de la agenda", () => {
    expect(rangoDeCita(agenda({ duracionMinutos: 45 }), "2026-09-14T12:30:00.000Z")).toEqual({
      inicio: "2026-09-14T12:30:00.000Z",
      fin: "2026-09-14T13:15:00.000Z",
    });
  });
});

describe("describirCita", () => {
  it("se lee como lo diría una persona", () => {
    expect(describirCita("2026-09-19T13:00:00.000Z")).toBe("Sábado 19 de septiembre, 09:00");
  });

  /* Las 21:00 de Bolivia son la 1 de la mañana del día siguiente en UTC. Sin la
     zona, la confirmación diría el día equivocado en toda la tarde. */
  it("una cita de la noche conserva su día", () => {
    expect(describirCita("2026-09-20T01:00:00.000Z")).toBe("Sábado 19 de septiembre, 21:00");
  });

  it("devuelve vacío con lo que no se puede leer", () => {
    expect(describirCita("cuando puedas")).toBe("");
  });
});
