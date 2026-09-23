import { describe, expect, it } from "vitest";

import { CREAR, SIN_CATEGORIA, SIN_TITULO, proponerDestinos } from "./destinos-de-lista";

const CATEGORIAS = [
  { id: "ref", nombre: "Refrescos" },
  { id: "alm", nombre: "Almuerzos" },
  { id: "pos", nombre: "Postres" },
];

describe("a qué categoría va cada sección de una lista leída", () => {
  it("la categoría que se llama igual gana, aunque la lectura sugiera otra", () => {
    const { destinos, sugeridas } = proponerDestinos(
      [{ categoria: "ALMUERZOS", categoriaSugeridaId: "pos" }],
      CATEGORIAS,
    );
    expect(destinos.ALMUERZOS).toBe("alm");
    expect(sugeridas.size).toBe(0);
  });

  it("sin una que se llame igual, va a la más parecida que sugirió la lectura", () => {
    const { destinos, sugeridas } = proponerDestinos(
      [
        { categoria: "BEBIDAS", categoriaSugeridaId: "ref" },
        { categoria: "BEBIDAS", categoriaSugeridaId: "ref" },
      ],
      CATEGORIAS,
    );
    expect(destinos.BEBIDAS).toBe("ref");
    expect([...sugeridas]).toEqual(["BEBIDAS"]);
  });

  it("gana la sugerencia de la mayoría de la sección", () => {
    const { destinos } = proponerDestinos(
      [
        { categoria: "DULCES", categoriaSugeridaId: "ref" },
        { categoria: "DULCES", categoriaSugeridaId: "pos" },
        { categoria: "DULCES", categoriaSugeridaId: "pos" },
      ],
      CATEGORIAS,
    );
    expect(destinos.DULCES).toBe("pos");
  });

  it("en un empate, la del primer renglón", () => {
    const { destinos } = proponerDestinos(
      [
        { categoria: "VARIOS", categoriaSugeridaId: "alm" },
        { categoria: "VARIOS", categoriaSugeridaId: "pos" },
      ],
      CATEGORIAS,
    );
    expect(destinos.VARIOS).toBe("alm");
  });

  it("sin coincidencia ni sugerencia, propone crear la categoría", () => {
    const { destinos, sugeridas } = proponerDestinos(
      [{ categoria: "FERRETERÍA", categoriaSugeridaId: null }],
      CATEGORIAS,
    );
    expect(destinos["FERRETERÍA"]).toBe(CREAR);
    expect(sugeridas.size).toBe(0);
  });

  /* Una categoría que se borró mientras se leía la foto no puede quedar como
     destino: el guardado fallaría o crearía el producto huérfano. */
  it("una sugerencia a una categoría que ya no existe no cuenta", () => {
    const { destinos } = proponerDestinos(
      [{ categoria: "BEBIDAS", categoriaSugeridaId: "borrada" }],
      CATEGORIAS,
    );
    expect(destinos.BEBIDAS).toBe(CREAR);
  });

  it("los productos sin título van sin categoría", () => {
    const { destinos } = proponerDestinos([{ categoria: "", categoriaSugeridaId: "ref" }], CATEGORIAS);
    expect(destinos[SIN_TITULO]).toBe(SIN_CATEGORIA);
  });

  it("sin categorías en el negocio, todo lo titulado se propone crear", () => {
    const { destinos } = proponerDestinos(
      [
        { categoria: "BEBIDAS", categoriaSugeridaId: "ref" },
        { categoria: "POSTRES" },
      ],
      [],
    );
    expect(destinos).toEqual({ BEBIDAS: CREAR, POSTRES: CREAR });
  });
});
