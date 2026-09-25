import { describe, expect, it } from "vitest";

import type { ProductoPlantilla } from "../../lib/plantillas/tipos";
import { textoDeExistencias } from "./estado-stock-producto";

function producto(cambios: Partial<ProductoPlantilla> = {}): ProductoPlantilla {
  return {
    id: "p1",
    lineaAtributos: null,
    variantes: [],
    vendeTiempo: false,
    especificaciones: [],
    codigo: "PRD-1",
    nombre: "Zapatillas urbanas",
    descripcion: null,
    precio: 280,
    precioOriginal: 280,
    tienePromocion: false,
    imagen: null,
    imagenes: [],
    controlaStock: true,
    cantidadDisponible: 25,
    maximoCantidad: 10,
    accionWhatsapp: null,
    ...cambios,
  };
}

const NUMEROS = [
  { id: "v37", nombre: "37", precio: 280, disponibles: 22, accionWhatsapp: null },
  { id: "v38", nombre: "38", precio: 280, disponibles: 3, accionWhatsapp: null },
];

describe("el renglón de existencias", () => {
  it("dice cuántas quedan de un producto que se vende de una sola forma", () => {
    expect(textoDeExistencias(producto())).toBe("Quedan 25 unidades");
    expect(textoDeExistencias(producto({ cantidadDisponible: 1 }))).toBe("Queda 1 unidad");
    expect(textoDeExistencias(producto({ controlaStock: false }))).toBeNull();
  });

  /* La ficha decía «Quedan 25 unidades» arriba y «38 · Quedan 3» en el
     selector: dos números que no se contradicen pero confunden, porque 25 no se
     pueden pedir de ninguna talla. */
  it("calla el total cuando el producto tiene presentaciones", () => {
    expect(textoDeExistencias(producto({ variantes: NUMEROS }))).toBeNull();
  });

  it("dice que no hay cuando no queda ninguna presentación", () => {
    expect(textoDeExistencias(producto({ variantes: NUMEROS, cantidadDisponible: 0 }))).toBe(
      "Sin unidades disponibles",
    );
  });
});
