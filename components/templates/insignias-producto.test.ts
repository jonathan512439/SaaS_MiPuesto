import { describe, expect, it } from "vitest";

import type { ProductoPlantilla } from "../../lib/plantillas/tipos";
import { insigniaDe } from "./insignias-producto";

function producto(cambios: Partial<ProductoPlantilla> = {}): ProductoPlantilla {
  return {
    id: "p1",
    lineaAtributos: null,
  variantes: [],
  vendeTiempo: false,
  especificaciones: [],
  codigo: "PRD-1",
    nombre: "Coca Cola 2 L",
    descripcion: "Bien fría",
    precio: 12,
    precioOriginal: 12,
    tienePromocion: false,
    imagen: null,
    imagenes: [],
    controlaStock: false,
    cantidadDisponible: null,
    maximoCantidad: 10,
    accionWhatsapp: null,
    ...cambios,
  };
}

describe("la pastilla de una tarjeta", () => {
  /* El orden es el de urgencia para quien compra: que no lo pueda comprar
     importa más que el descuento. Un producto agotado y en oferta a la vez
     tiene que decir «agotado», no «oferta»: al revés se le ofrece algo que no
     está. */
  it("prefiere lo que le impide comprar antes que el descuento", () => {
    expect(
      insigniaDe(producto({ estado: "agotado", tienePromocion: true }))?.tipo,
    ).toBe("agotado");

    expect(
      insigniaDe(
        producto({
          controlaStock: true,
          cantidadDisponible: 2,
          tienePromocion: true,
        }),
      )?.tipo,
    ).toBe("ultimas");
  });

  it("cuenta bien las últimas unidades", () => {
    const conStock = (cantidadDisponible: number) =>
      insigniaDe(producto({ controlaStock: true, cantidadDisponible }));

    expect(conStock(1)?.texto).toBe("Queda 1");
    expect(conStock(2)?.texto).toBe("Quedan 2");
    expect(conStock(3)?.texto).toBe("Quedan 3");
  });

  /* Con un número más alto la urgencia deja de ser cierta: una pastilla que
     está siempre puesta se vuelve parte del dibujo y nadie la lee. */
  it("deja de avisar cuando ya no es poco", () => {
    expect(insigniaDe(producto({ controlaStock: true, cantidadDisponible: 4 }))).toBeNull();
    expect(insigniaDe(producto({ controlaStock: true, cantidadDisponible: 50 }))).toBeNull();
  });

  /* Cero no es «quedan pocas», es agotado, y de eso se encarga el estado del
     producto. Si esta rama lo tomara, un producto sin unidades diría «Quedan 0».
     */
  it("no dice que quedan cero", () => {
    expect(insigniaDe(producto({ controlaStock: true, cantidadDisponible: 0 }))).toBeNull();
  });

  /* Sin control de existencias, la cantidad que venga no significa nada: son
     productos que se reponen y de los que nadie lleva la cuenta. */
  it("ignora la cantidad de quien no lleva la cuenta", () => {
    expect(insigniaDe(producto({ controlaStock: false, cantidadDisponible: 1 }))).toBeNull();
  });

  it("muestra la oferta cuando no hay nada más urgente", () => {
    expect(insigniaDe(producto({ tienePromocion: true }))).toEqual({
      tipo: "oferta",
      texto: "Oferta",
    });
  });

  it("no pone nada en un producto corriente", () => {
    expect(insigniaDe(producto())).toBeNull();
  });
});
