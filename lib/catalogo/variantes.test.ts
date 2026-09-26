import { describe, expect, it } from "vitest";

import {
  MAXIMO_VARIANTES,
  leerVariantes,
  precioDeVariante,
  controlDeExistenciasPedido,
  cuerpoDeGuardadoDePresentaciones,
  tipoSugeridoPorCategoria,
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

  it("rechaza una de más que el tope", () => {
    const muchas = Array.from({ length: MAXIMO_VARIANTES + 1 }, (_, i) => ({
      nombre: `Talla ${i}`,
    }));
    const resultado = validarVariantes(muchas, SIN_STOCK);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores.variantes).toContain(String(MAXIMO_VARIANTES));
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
        expect(resultado.errores["variantes.0.cantidadStock"]).toContain("Llevar la cuenta de cuántas quedan");
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

    /* Hasta la fase 13 un vacío acá significaba «esta talla no lleva cuenta».
       Desde que las existencias de un producto con presentaciones viven en cada
       una, una talla sin número no se podría pedir nunca: se exige, igual que
       la base (`EXISTENCIAS_POR_PRESENTACION`). */
    it("exige las existencias de cada presentación si el producto las controla", () => {
      const resultado = validarVariantes([{ nombre: "M", cantidadStock: "" }], CON_STOCK);
      expect(resultado.correcto).toBe(false);
      if (!resultado.correcto) expect(resultado.errores["variantes.0.cantidadStock"]).toBeTruthy();
    });

    it("con el tipo «número», normaliza y rechaza lo que no es un número", () => {
      const bien = validarVariantes(
        [
          { nombre: "38.5", cantidadStock: "2" },
          { nombre: "40", cantidadStock: "1" },
        ],
        { ...CON_STOCK, tipo: "numero" },
      );
      expect(bien.correcto && bien.variantes.map(({ nombre }) => nombre)).toEqual(["38,5", "40"]);

      const mal = validarVariantes([{ nombre: "38,3", cantidadStock: "2" }], { ...CON_STOCK, tipo: "numero" });
      expect(mal.correcto).toBe(false);
      if (!mal.correcto) expect(mal.errores["variantes.0.nombre"]).toContain("no es un número de calzado");

      const repetidos = validarVariantes(
        [
          { nombre: "40", cantidadStock: "1" },
          { nombre: "40,0", cantidadStock: "1" },
        ],
        { ...CON_STOCK, tipo: "numero" },
      );
      expect(repetidos.correcto).toBe(false);
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

/* El editor de tallas enciende o apaga «llevar la cuenta» en el mismo guardado:
   se valida con lo que pidió y no con lo que el producto tenía guardado. */
describe("controlDeExistenciasPedido", () => {
  it("usa lo que pidió el editor y lo pasa a la base", () => {
    expect(controlDeExistenciasPedido(true, false)).toEqual({ controlaStock: true, cambio: true });
    expect(controlDeExistenciasPedido(false, true)).toEqual({ controlaStock: false, cambio: false });
  });

  it("sin pedido, queda como estaba y no se le dice nada a la base", () => {
    expect(controlDeExistenciasPedido(undefined, true)).toEqual({ controlaStock: true, cambio: null });
    expect(controlDeExistenciasPedido(undefined, false)).toEqual({ controlaStock: false, cambio: null });
  });

  it("no acepta algo que no sea sí o no", () => {
    expect(controlDeExistenciasPedido("true", false)).toEqual({ controlaStock: false, cambio: null });
    expect(controlDeExistenciasPedido(1, false)).toEqual({ controlaStock: false, cambio: null });
  });
});

/* Lo que el editor de tallas manda al guardar. Con «llevar la cuenta» apagado,
   las tallas viajan sin existencias aunque el campo tenga algo escrito: la base
   rechazaría existencias en un producto que no las controla. */
describe("cuerpoDeGuardadoDePresentaciones", () => {
  const tallas = [
    { id: null, nombre: "S", precio: "", cantidadStock: "3", visible: true },
    { id: "b6e3f0a2-6f1e-4c2a-9a51-1f1f1f1f1f1f", nombre: "M", precio: "95", cantidadStock: "", visible: false },
  ];

  it("con la cuenta encendida lleva las existencias de cada talla y lo pide a la base", () => {
    expect(cuerpoDeGuardadoDePresentaciones("talla", tallas, true)).toEqual({
      tipo: "talla",
      controlaStock: true,
      variantes: [
        { id: null, nombre: "S", precio: "", cantidadStock: "3", visible: true },
        { id: "b6e3f0a2-6f1e-4c2a-9a51-1f1f1f1f1f1f", nombre: "M", precio: "95", cantidadStock: "", visible: false },
      ],
    });
  });

  it("con la cuenta apagada las manda sin existencias", () => {
    const cuerpo = cuerpoDeGuardadoDePresentaciones("talla", tallas, false);
    expect(cuerpo.controlaStock).toBe(false);
    expect(cuerpo.variantes.map((variante) => variante.cantidadStock)).toEqual([null, null]);
  });

  it("agrega las existencias del producto solo cuando se piden", () => {
    expect(cuerpoDeGuardadoDePresentaciones("talla", [], true, 7).existenciasProducto).toBe(7);
    expect("existenciasProducto" in cuerpoDeGuardadoDePresentaciones("talla", tallas, true)).toBe(false);
  });
});

/* Una prenda nueva abre el editor de tallas en lo que usan las otras de su
   categoría y, si todavía no hay ninguna, en lo que sugiere su ícono. */
describe("tipoSugeridoPorCategoria", () => {
  it("sigue a lo que ya usan las otras de la categoría", () => {
    expect(tipoSugeridoPorCategoria(["talla", "talla", "numero"], "calzado")).toBe("talla");
    expect(tipoSugeridoPorCategoria(["tamano"], null)).toBe("tamano");
  });

  it("sin otras con presentaciones, mira el ícono", () => {
    expect(tipoSugeridoPorCategoria([], "remera")).toBe("talla");
    expect(tipoSugeridoPorCategoria([], "bebe")).toBe("talla");
    expect(tipoSugeridoPorCategoria([], "calzado")).toBe("numero");
  });

  it("con un empate, decide el ícono; sin ícono que diga algo, no sugiere", () => {
    expect(tipoSugeridoPorCategoria(["talla", "numero"], "calzado")).toBe("numero");
    expect(tipoSugeridoPorCategoria(["talla", "numero"], "reloj")).toBeNull();
  });

  it("no sugiere lo que no sabe ni lo que no es un tipo", () => {
    expect(tipoSugeridoPorCategoria([], "reloj")).toBeNull();
    expect(tipoSugeridoPorCategoria([], null)).toBeNull();
    expect(tipoSugeridoPorCategoria([null, "cualquiera"], null)).toBeNull();
  });
});
