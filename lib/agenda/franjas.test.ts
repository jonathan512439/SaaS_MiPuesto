import { describe, expect, it } from "vitest";

import {
  leerFranjas,
  minutosDesdeHora,
  ordenarFranjas,
  resumirFranjas,
  validarFranjas,
} from "./franjas";

const lunesManana = { dia: 1, desde: "08:30", hasta: "12:00" };
const lunesTarde = { dia: 1, desde: "14:30", hasta: "18:30" };

describe("validarFranjas", () => {
  it("acepta una semana de trabajo", () => {
    const resultado = validarFranjas([lunesManana, lunesTarde]);
    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) expect(resultado.franjas).toHaveLength(2);
  });

  it("acepta una semana vacía, que es como nace una categoría", () => {
    expect(validarFranjas([])).toEqual({ correcto: true, franjas: [] });
    expect(validarFranjas(undefined)).toEqual({ correcto: true, franjas: [] });
  });

  it("rechaza una hora mal escrita", () => {
    const resultado = validarFranjas([{ dia: 1, desde: "8:30", hasta: "12:00" }]);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores["franjas.0.desde"]).toBeTruthy();
    expect(validarFranjas([{ dia: 1, desde: "25:00", hasta: "26:00" }]).correcto).toBe(false);
  });

  it("rechaza un día que no existe", () => {
    expect(validarFranjas([{ ...lunesManana, dia: 7 }]).correcto).toBe(false);
    expect(validarFranjas([{ ...lunesManana, dia: -1 }]).correcto).toBe(false);
  });

  it("rechaza un tramo que cierra antes de abrir", () => {
    const resultado = validarFranjas([{ dia: 1, desde: "18:00", hasta: "09:00" }]);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores["franjas.0.hasta"]).toBeTruthy();
  });

  it("rechaza un tramo de duración cero", () => {
    expect(validarFranjas([{ dia: 1, desde: "09:00", hasta: "09:00" }]).correcto).toBe(false);
  });

  /* Dos tramos solapados generarían el mismo horario dos veces, y el cliente
     vería «10:00» repetido en la lista. */
  it("rechaza dos tramos del mismo día que se pisan", () => {
    const resultado = validarFranjas([
      { dia: 1, desde: "08:00", hasta: "12:00" },
      { dia: 1, desde: "10:00", hasta: "14:00" },
    ]);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores["franjas.1.desde"]).toContain("pisa");
  });

  it("acepta dos tramos del mismo día que se tocan sin pisarse", () => {
    expect(
      validarFranjas([
        { dia: 1, desde: "08:00", hasta: "12:00" },
        { dia: 1, desde: "12:00", hasta: "16:00" },
      ]).correcto,
    ).toBe(true);
  });

  it("los mismos horarios en días distintos no se pisan", () => {
    expect(validarFranjas([lunesManana, { ...lunesManana, dia: 2 }]).correcto).toBe(true);
  });

  it("rechaza más de treinta tramos", () => {
    const muchos = Array.from({ length: 31 }, () => lunesManana);
    expect(validarFranjas(muchos).correcto).toBe(false);
  });

  it("devuelve la semana ordenada", () => {
    const resultado = validarFranjas([{ ...lunesManana, dia: 3 }, lunesTarde, lunesManana]);
    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) {
      expect(resultado.franjas.map(({ dia, desde }) => `${dia}-${desde}`)).toEqual([
        "1-08:30",
        "1-14:30",
        "3-08:30",
      ]);
    }
  });

  it("no rompe con lo que no es una lista", () => {
    expect(validarFranjas("de lunes a viernes").correcto).toBe(false);
    expect(validarFranjas([null, 7]).correcto).toBe(false);
  });
});

describe("leerFranjas", () => {
  /* Lo contrario del validador: acá no hay a quién avisarle. Un tramo mal
     formado no puede dejar la ficha del producto sin cargar. */
  it("descarta en silencio lo que está mal", () => {
    expect(leerFranjas([{ dia: 9, desde: "08:00", hasta: "12:00" }])).toEqual([]);
    expect(leerFranjas([{ dia: 1, desde: "ocho", hasta: "12:00" }])).toEqual([]);
    expect(leerFranjas([{ dia: 1, desde: "18:00", hasta: "09:00" }])).toEqual([]);
    expect(leerFranjas(null)).toEqual([]);
  });

  it("conserva lo bueno aunque haya algo malo al lado", () => {
    expect(leerFranjas([{ dia: 9, desde: "08:00", hasta: "12:00" }, lunesManana])).toEqual([
      lunesManana,
    ]);
  });
});

describe("minutosDesdeHora", () => {
  it("cuenta desde la medianoche", () => {
    expect(minutosDesdeHora("00:00")).toBe(0);
    expect(minutosDesdeHora("08:30")).toBe(510);
    expect(minutosDesdeHora("23:59")).toBe(1439);
  });
});

describe("resumirFranjas", () => {
  it("se lee en una línea", () => {
    expect(resumirFranjas([lunesManana, lunesTarde])).toBe("Lun 08:30–12:00 · Lun 14:30–18:30");
  });

  /* Sin horario no se dibuja una línea vacía: se dice que falta, que es lo que
     el dueño tiene que ver en el panel. */
  it("dice cuando no hay nada configurado", () => {
    expect(resumirFranjas([])).toBe("Sin horario configurado");
  });
});

describe("ordenarFranjas", () => {
  it("no toca el arreglo que recibe", () => {
    const original = [lunesTarde, lunesManana];
    ordenarFranjas(original);
    expect(original[0]).toBe(lunesTarde);
  });
});
