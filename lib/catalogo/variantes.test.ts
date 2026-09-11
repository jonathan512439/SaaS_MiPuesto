import { describe, expect, it } from "vitest";

import {
  MAXIMO_VARIANTES,
  leerVariantes,
  precioDeVariante,
  validarVariantes,
} from "./variantes";

const CON_STOCK = { controlaStock: true, vendeTiempo: false };
const SIN_STOCK = { controlaStock: false, vendeTiempo: false };

describe("validarVariantes", () => {
  it("acepta tres tallas sin precio propio", () => {
    const resultado = validarVariantes(
      [{ nombre: "S" }, { nombre: "M" }, { nombre: "L" }],
      SIN_STOCK,
    );
    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) {
      expect(resultado.variantes.map(({ precio }) => precio)).toEqual([null, null, null]);
    }
  });

  it("acepta presentaciones con precio distinto", () => {
    const resultado = validarVariantes(
      [
        { nombre: "3 kg", precio: 85 },
        { nombre: "7,5 kg", precio: 190 },
      ],
      SIN_STOCK,
    );
    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) expect(resultado.variantes[1].precio).toBe(190);
  });

  it("acepta que no haya ninguna, que es lo normal", () => {
    expect(validarVariantes([], SIN_STOCK)).toEqual({ correcto: true, variantes: [] });
    expect(validarVariantes(undefined, SIN_STOCK)).toEqual({ correcto: true, variantes: [] });
  });

  it("exige el nombre", () => {
    const resultado = validarVariantes([{ nombre: "   " }], SIN_STOCK);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores["variantes.0.nombre"]).toBeTruthy();
  });

  /* Dos tallas «M» dejarían al comprador eligiendo entre dos opciones idénticas
     y al dueño sin saber cuál le pidieron. */
  it("rechaza dos con el mismo nombre", () => {
    const resultado = validarVariantes([{ nombre: "M" }, { nombre: "m" }], SIN_STOCK);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores["variantes.1.nombre"]).toBeTruthy();
  });

  it("rechaza la trece", () => {
    const muchas = Array.from({ length: MAXIMO_VARIANTES + 1 }, (_, i) => ({
      nombre: `Talla ${i}`,
    }));
    const resultado = validarVariantes(muchas, SIN_STOCK);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores.variantes).toContain("12");
  });

  /* Un servicio no tiene presentaciones: tiene horarios, y esos los da la
     agenda. Aceptarlas dejaría «3 kg» colgando de una consulta veterinaria. */
  it("rechaza presentaciones en una categoría que vende tiempo", () => {
    const resultado = validarVariantes([{ nombre: "3 kg" }], {
      controlaStock: false,
      vendeTiempo: true,
    });
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores.variantes).toContain("agenda");
  });

  it("no se queja si la categoría vende tiempo y no hay presentaciones", () => {
    expect(validarVariantes([], { controlaStock: false, vendeTiempo: true }).correcto).toBe(true);
  });

  describe("existencias", () => {
    it("las acepta si el producto las controla", () => {
      const resultado = validarVariantes([{ nombre: "M", cantidadStock: 3 }], CON_STOCK);
      expect(resultado.correcto).toBe(true);
      if (resultado.correcto) expect(resultado.variantes[0].cantidadStock).toBe(3);
    });

    /* Se avisa en vez de guardarlo callado: un número de existencias en un
       producto que no las controla no se muestra en ninguna parte, y el dueño
       quedaría creyendo que lo está llevando. */
    it("avisa si el producto no controla existencias", () => {
      const resultado = validarVariantes([{ nombre: "M", cantidadStock: 3 }], SIN_STOCK);
      expect(resultado.correcto).toBe(false);
      if (!resultado.correcto) {
        expect(resultado.errores["variantes.0.cantidadStock"]).toContain("Controlar existencias");
      }
    });

    it("rechaza existencias negativas o con decimales", () => {
      expect(validarVariantes([{ nombre: "M", cantidadStock: -1 }], CON_STOCK).correcto).toBe(
        false,
      );
      expect(validarVariantes([{ nombre: "M", cantidadStock: 1.5 }], CON_STOCK).correcto).toBe(
        false,
      );
    });

    it("acepta vacío, que significa que esta presentación no lleva cuenta", () => {
      const resultado = validarVariantes([{ nombre: "M", cantidadStock: "" }], CON_STOCK);
      expect(resultado.correcto).toBe(true);
      if (resultado.correcto) expect(resultado.variantes[0].cantidadStock).toBeNull();
    });
  });

  it("rechaza un precio que no es número", () => {
    const resultado = validarVariantes([{ nombre: "M", precio: "caro" }], SIN_STOCK);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores["variantes.0.precio"]).toBeTruthy();
  });

  it("no rompe con lo que no es una lista", () => {
    expect(validarVariantes("tres tallas", SIN_STOCK).correcto).toBe(false);
    expect(validarVariantes([null, 7], SIN_STOCK).correcto).toBe(false);
  });
});

describe("leerVariantes", () => {
  it("lee las guardadas, con el nombre de columna de la base", () => {
    expect(
      leerVariantes([{ id: "v-1", nombre: "M", precio: null, cantidad_stock: 3 }]),
    ).toEqual([{ id: "v-1", nombre: "M", precio: null, cantidadStock: 3, visible: true }]);
  });

  it("descarta en silencio lo que no se puede dibujar", () => {
    expect(leerVariantes([{ nombre: "M" }])).toEqual([]);
    expect(leerVariantes([{ id: "v-1", nombre: "  " }])).toEqual([]);
    expect(leerVariantes(null)).toEqual([]);
  });
});

describe("precioDeVariante", () => {
  it("el propio si lo tiene", () => {
    expect(precioDeVariante(45, { precio: 190 })).toBe(190);
  });

  /* El caso común: una remera en tres tallas cuesta lo mismo, y guardar el
     precio repetido obligaría a corregirlo tres veces al cambiarlo. */
  it("el del producto si no lo tiene", () => {
    expect(precioDeVariante(45, { precio: null })).toBe(45);
  });

  it("cero es un precio, no una ausencia", () => {
    expect(precioDeVariante(45, { precio: 0 })).toBe(0);
  });
});
