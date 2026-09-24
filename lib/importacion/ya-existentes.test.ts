import { describe, expect, it } from "vitest";

import { normalizarNombre, posicionesYaExistentes } from "./ya-existentes";

describe("los productos de una importación que ya están en el catálogo", () => {
  it("se reconocen por el nombre, sin tildes, mayúsculas ni espacios de más", () => {
    const leidos = [{ nombre: "Pollo a la Brasa " }, { nombre: "Salteña de pollo" }, { nombre: "Café  con leche" }];
    expect([...posicionesYaExistentes(leidos, ["pollo a la brasa", "CAFE CON LECHE"])]).toEqual([0, 2]);
  });

  it("una importación cortada a la mitad: al volver a subirla, lo creado queda afuera", () => {
    const archivo = Array.from({ length: 10 }, (_, indice) => ({ nombre: `Producto ${indice + 1}` }));
    const creadosAntesDelCorte = archivo.slice(0, 4).map(({ nombre }) => nombre);
    expect(posicionesYaExistentes(archivo, creadosAntesDelCorte).size).toBe(4);
  });

  it("un catálogo vacío no deja nada afuera", () => {
    expect(posicionesYaExistentes([{ nombre: "Pan" }], []).size).toBe(0);
  });

  it("normaliza igual que se compara", () => {
    expect(normalizarNombre("  Ñandú  Azúcar ")).toBe("nandu azucar");
  });
});
