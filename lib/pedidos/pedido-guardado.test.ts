import { beforeEach, describe, expect, it } from "vitest";

import type { ProductoPlantilla } from "../plantillas/tipos";
import { clavePedido, guardarPedido, leerPedidoGuardado } from "./pedido-guardado";

/* Un almacenamiento de sesión mínimo en vez de un entorno de navegador
   completo: la suite corre en Node y sumar jsdom sería una dependencia nueva
   para cubrir cuatro métodos. */
function crearAlmacenamiento(): Storage {
  const datos = new Map<string, string>();
  return {
    get length() {
      return datos.size;
    },
    clear: () => datos.clear(),
    getItem: (clave: string) => datos.get(clave) ?? null,
    key: (indice: number) => [...datos.keys()][indice] ?? null,
    removeItem: (clave: string) => {
      datos.delete(clave);
    },
    setItem: (clave: string, valor: string) => {
      datos.set(clave, valor);
    },
  };
}

const almacenamiento = crearAlmacenamiento();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { sessionStorage: almacenamiento },
});

const NEGOCIO = "negocio-1";

const PRODUCTO: ProductoPlantilla = {
  id: "prod-1",
  lineaAtributos: null,
  variantes: [],
  vendeTiempo: false,
  proximoTurno: null,
  especificaciones: [],
  codigo: "PRD-1",
  nombre: "Polera",
  descripcion: "Algodón",
  precio: 50,
  precioOriginal: 50,
  tienePromocion: false,
  imagen: null,
  imagenes: [],
  controlaStock: false,
  cantidadDisponible: null,
  maximoCantidad: 5,
  accionWhatsapp: null,
};

function escribirCrudo(valor: string) {
  window.sessionStorage.setItem(clavePedido(NEGOCIO), valor);
}

describe("pedido guardado", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("devuelve un pedido vacío cuando no hay nada guardado", () => {
    expect(leerPedidoGuardado(NEGOCIO)).toEqual({ cantidades: {}, elegidos: {} });
  });

  it("guarda y recupera lo elegido", () => {
    guardarPedido(NEGOCIO, {
      cantidades: { "prod-1": 2 },
      elegidos: { "prod-1": PRODUCTO },
    });
    expect(leerPedidoGuardado(NEGOCIO)).toEqual({
      cantidades: { "prod-1": 2 },
      elegidos: { "prod-1": PRODUCTO },
    });
  });

  it("borra la entrada cuando el pedido queda vacío", () => {
    guardarPedido(NEGOCIO, { cantidades: { "prod-1": 1 }, elegidos: { "prod-1": PRODUCTO } });
    guardarPedido(NEGOCIO, { cantidades: {}, elegidos: {} });
    expect(window.sessionStorage.getItem(clavePedido(NEGOCIO))).toBeNull();
  });

  it("no se rompe con contenido corrupto", () => {
    escribirCrudo("{no es json");
    expect(leerPedidoGuardado(NEGOCIO)).toEqual({ cantidades: {}, elegidos: {} });
  });

  /* Una cantidad sin su producto no se puede mostrar ni cobrar: llegaría al
     resumen como una fila fantasma. */
  it("descarta cantidades sin producto", () => {
    escribirCrudo(JSON.stringify({ cantidades: { fantasma: 3 }, elegidos: {} }));
    expect(leerPedidoGuardado(NEGOCIO).cantidades).toEqual({});
  });

  it("descarta productos incompletos", () => {
    escribirCrudo(
      JSON.stringify({
        cantidades: { "prod-1": 1 },
        elegidos: { "prod-1": { id: "prod-1", nombre: "Sin precio" } },
      }),
    );
    expect(leerPedidoGuardado(NEGOCIO)).toEqual({ cantidades: {}, elegidos: {} });
  });

  it.each([0, -2, 1.5, "dos"])("descarta la cantidad inválida %o", (cantidad) => {
    escribirCrudo(
      JSON.stringify({ cantidades: { "prod-1": cantidad }, elegidos: { "prod-1": PRODUCTO } }),
    );
    expect(leerPedidoGuardado(NEGOCIO).cantidades).toEqual({});
  });

  it("recorta una cantidad mayor al máximo del producto", () => {
    escribirCrudo(
      JSON.stringify({ cantidades: { "prod-1": 99 }, elegidos: { "prod-1": PRODUCTO } }),
    );
    expect(leerPedidoGuardado(NEGOCIO).cantidades).toEqual({ "prod-1": 5 });
  });

  it("separa el pedido de cada negocio", () => {
    guardarPedido(NEGOCIO, { cantidades: { "prod-1": 1 }, elegidos: { "prod-1": PRODUCTO } });
    expect(leerPedidoGuardado("otro-negocio").cantidades).toEqual({});
  });
});
