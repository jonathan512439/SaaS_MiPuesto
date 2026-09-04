import { describe, expect, it } from "vitest";

import {
  DURACION_AVISO,
  MAXIMO_AVISOS,
  reducirCola,
  type Aviso,
} from "./cola-avisos";

function crearAviso(id: string, restante = DURACION_AVISO): Aviso {
  return { id, titulo: `Título ${id}`, mensaje: "Mensaje", variante: "exito", restante };
}

describe("reducirCola", () => {
  it("agrega avisos al final de la cola", () => {
    const cola = reducirCola([crearAviso("a")], { tipo: "mostrar", aviso: crearAviso("b") });

    expect(cola.map(({ id }) => id)).toEqual(["a", "b"]);
  });

  it("descarta el aviso más viejo al superar el máximo", () => {
    const llena = Array.from({ length: MAXIMO_AVISOS }, (_, indice) =>
      crearAviso(`viejo-${indice}`),
    );

    const cola = reducirCola(llena, { tipo: "mostrar", aviso: crearAviso("nuevo") });

    expect(cola).toHaveLength(MAXIMO_AVISOS);
    expect(cola.at(0)?.id).toBe("viejo-1");
    expect(cola.at(-1)?.id).toBe("nuevo");
  });

  it("cierra solo el aviso indicado", () => {
    const cola = reducirCola([crearAviso("a"), crearAviso("b")], { tipo: "cerrar", id: "a" });

    expect(cola.map(({ id }) => id)).toEqual(["b"]);
  });

  it("descuenta el tiempo transcurrido sin eliminar los que siguen vigentes", () => {
    const cola = reducirCola([crearAviso("a", 1000)], { tipo: "transcurrir", ms: 250 });

    expect(cola).toEqual([expect.objectContaining({ id: "a", restante: 750 })]);
  });

  it("elimina los avisos cuyo tiempo llegó a cero", () => {
    const cola = reducirCola([crearAviso("a", 250), crearAviso("b", 1000)], {
      tipo: "transcurrir",
      ms: 250,
    });

    expect(cola.map(({ id }) => id)).toEqual(["b"]);
  });

  it("vacía la cola tras la duración completa, sin dejar tiempos negativos", () => {
    let cola: Aviso[] = [crearAviso("a")];

    for (let paso = 0; paso < DURACION_AVISO / 250; paso += 1) {
      cola = reducirCola(cola, { tipo: "transcurrir", ms: 250 });
      expect(cola.every(({ restante }) => restante > 0)).toBe(true);
    }

    expect(cola).toEqual([]);
  });
});
