import { describe, expect, it } from "vitest";

import type { ProductoPlantilla } from "../plantillas/tipos";
import { construirFirmaCarrito } from "./firma";
import { idDeRenglon, itemDeRenglon, renglonDePresentacion } from "./linea";

const ZAPATILLA: ProductoPlantilla = {
  id: "p1",
  codigo: "PRD-1",
  nombre: "Zapatilla Runner",
  descripcion: "",
  precio: 280,
  precioOriginal: 350,
  tienePromocion: true,
  imagen: null,
  imagenes: [],
  estado: "disponible",
  controlaStock: true,
  cantidadDisponible: 5,
  maximoCantidad: 5,
  accionWhatsapp: null,
  lineaAtributos: null,
  especificaciones: [],
  vendeTiempo: false,
  tipoPresentacion: "numero",
  variantes: [
    { id: "v40", nombre: "40", precio: 280, disponibles: 3, accionWhatsapp: null },
    { id: "v41", nombre: "41", precio: 300, disponibles: 0, accionWhatsapp: null },
  ],
};

describe("el renglón del carrito para una presentación", () => {
  it("lleva el nombre con la presentación, su precio y lo que queda de ella", () => {
    const renglon = renglonDePresentacion(ZAPATILLA, "v40")!;
    expect(renglon.id).toBe("p1:v40");
    expect(renglon.nombre).toBe("Zapatilla Runner (N.º 40)");
    expect(renglon.precio).toBe(280);
    expect(renglon.maximoCantidad).toBe(3);
    expect(renglon.variantes).toEqual([]);
    expect(renglon.seleccion).toEqual({ productoId: "p1", varianteId: "v40" });
  });

  it("la promoción solo se tacha si la presentación cobra el precio del producto", () => {
    expect(renglonDePresentacion(ZAPATILLA, "v40")!.tienePromocion).toBe(true);
    const conPrecioPropio = renglonDePresentacion(ZAPATILLA, "v41")!;
    expect(conPrecioPropio.tienePromocion).toBe(false);
    expect(conPrecioPropio.precioOriginal).toBe(300);
  });

  it("una presentación sin existencias queda agotada", () => {
    const renglon = renglonDePresentacion(ZAPATILLA, "v41")!;
    expect(renglon.estado).toBe("agotado");
    expect(renglon.maximoCantidad).toBe(0);
  });

  it("una presentación que no es del producto no arma renglón", () => {
    expect(renglonDePresentacion(ZAPATILLA, "otra")).toBeNull();
  });

  it("al servidor viajan el producto y la presentación por separado, sin precio", () => {
    expect(itemDeRenglon(renglonDePresentacion(ZAPATILLA, "v40")!, 2)).toEqual({
      productoId: "p1",
      varianteId: "v40",
      cantidad: 2,
    });
    /* Un renglón de antes de la fase 13 es el producto mismo. */
    expect(itemDeRenglon(ZAPATILLA, 1)).toEqual({ productoId: "p1", varianteId: null, cantidad: 1 });
  });

  it("el 40 y el 41 son dos renglones, y la firma de la selección los distingue", () => {
    const firmaUno = construirFirmaCarrito({ [idDeRenglon("p1", "v40")]: 1 });
    const firmaOtro = construirFirmaCarrito({ [idDeRenglon("p1", "v41")]: 1 });
    expect(firmaUno).not.toBe(firmaOtro);
  });
});
