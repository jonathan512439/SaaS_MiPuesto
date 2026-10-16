import { describe, expect, it } from "vitest";

import {
  diaElegible,
  esFecha,
  fechaParaLeer,
  horasDelDia,
  minutosDelPaso,
  RATOS_DEL_DIA,
  semanasDelMes,
  sumarDias,
  tituloDelMes,
} from "./calendario";

/* Las cuentas del calendario del panel. Un error acá corre los turnos de día,
   así que se prueban las puntas: meses que empiezan en domingo, fin de año,
   febrero bisiesto. */

describe("semanasDelMes", () => {
  it("empieza en lunes y completa la primera semana con el mes anterior", () => {
    /* Octubre de 2026 empieza en jueves. */
    const semanas = semanasDelMes(2026, 9);
    expect(semanas[0].map(({ fecha }) => fecha)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(semanas[0][0].delMes).toBe(false);
    expect(semanas[0][3]).toEqual({ fecha: "2026-10-01", numero: 1, delMes: true });
  });

  it("un mes que empieza en domingo retrocede seis días, y tiene seis semanas si hace falta", () => {
    /* Noviembre de 2026 empieza en domingo. */
    const semanas = semanasDelMes(2026, 10);
    expect(semanas[0][6]).toEqual({ fecha: "2026-11-01", numero: 1, delMes: true });
    expect(semanas).toHaveLength(6);
  });

  it("cada semana tiene siete días y el mes entero aparece una sola vez", () => {
    const semanas = semanasDelMes(2028, 1);
    expect(semanas.every((semana) => semana.length === 7)).toBe(true);
    const delMes = semanas.flat().filter(({ delMes }) => delMes);
    expect(delMes).toHaveLength(29);
  });

  it("cruza de año", () => {
    const semanas = semanasDelMes(2026, 11);
    expect(semanas.at(-1)!.at(-1)!.fecha).toBe("2027-01-03");
    expect(tituloDelMes(2026, 12)).toBe("enero de 2027");
  });
});

describe("las fechas para leer", () => {
  it("dice el día, el número y el mes, y el año solo si no es el de referencia", () => {
    expect(fechaParaLeer("2026-10-15", "2026-10-14")).toBe("jueves 15 de octubre");
    expect(fechaParaLeer("2027-01-02", "2026-10-14")).toBe("sábado 2 de enero de 2027");
  });

  it("suma días cruzando meses y años", () => {
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("reconoce una fecha y rechaza lo que no es", () => {
    expect(esFecha("2026-10-15")).toBe(true);
    expect(esFecha("15/10/2026")).toBe(false);
    expect(esFecha(null)).toBe(false);
  });
});

describe("las horas", () => {
  it("van en 24 horas, sin AM ni PM", () => {
    const horas = horasDelDia(30);
    expect(horas).toHaveLength(48);
    expect(horas[0]).toBe("00:00");
    expect(horas).toContain("14:30");
    expect(horas.join(" ")).not.toMatch(/AM|PM/i);
  });
});

describe("los topes", () => {
  it("respeta el mínimo y el máximo", () => {
    expect(diaElegible("2026-10-13", "2026-10-14")).toBe(false);
    expect(diaElegible("2026-10-14", "2026-10-14")).toBe(true);
    expect(diaElegible("2026-12-01", undefined, "2026-11-30")).toBe(false);
  });
});

/* El selector de hora del panel, en dos toques: la hora y los minutos. */
describe("la hora en dos toques", () => {
  it("las veinticuatro horas, una sola vez, en cuatro ratos de seis", () => {
    const horas = RATOS_DEL_DIA.flatMap(({ horas: deRato }) => deRato);
    expect(horas).toHaveLength(24);
    expect(new Set(horas).size).toBe(24);
    expect(RATOS_DEL_DIA.map(({ nombre }) => nombre)).toEqual(["Madrugada", "Mañana", "Tarde", "Noche"]);
  });

  it("los minutos del paso, y los de la hora guardada si no caen en él", () => {
    expect(minutosDelPaso(15)).toEqual(["00", "15", "30", "45"]);
    expect(minutosDelPaso(30)).toEqual(["00", "30"]);
    expect(minutosDelPaso(15, "09:07")).toEqual(["00", "07", "15", "30", "45"]);
    expect(minutosDelPaso(15, "09:30")).toEqual(["00", "15", "30", "45"]);
  });
});
