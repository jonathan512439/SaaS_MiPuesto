import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { obtenerProductoAgendable } from "./agenda/servidor";
import { cambiosDeAjuste } from "./catalogo/precios-lote";
import { validarProducto } from "./catalogo/validacion";
import { calcularPrecioProducto, tienePrecio, type PromocionPrecio } from "./precios";
import { construirMensajeConsulta } from "./whatsapp";

/* Fase 14: un producto sin precio (`docs/plan/11-PRODUCTOS-SIN-PRECIO.md`).
 *
 * Nulo o 0 es «sin precio», y la regla vive en un solo lugar, `tienePrecio`. Lo
 * que la pantalla dibuja lo cubre la prueba de dibujo; esto es la lógica que la
 * pantalla usa para decidir. */

const PROMOCION: PromocionPrecio = {
  activo: true,
  categoria_id: null,
  fecha_fin: null,
  fecha_inicio: null,
  producto_id: "producto-1",
  tipo: "monto_fijo",
  valor: 5,
};

describe("tienePrecio", () => {
  it("nulo, vacío y 0 son sin precio, en número o en texto", () => {
    for (const valor of [null, undefined, 0, "0", "0.00", "", "  "]) {
      expect(tienePrecio(valor), String(valor)).toBe(false);
    }
  });

  it("lo que no es un precio de verdad tampoco cuenta como precio", () => {
    for (const valor of [Number.NaN, Number.POSITIVE_INFINITY, -1, "abc"]) {
      expect(tienePrecio(valor), String(valor)).toBe(false);
    }
  });

  it("cualquier monto positivo es un precio", () => {
    for (const valor of [0.5, 45, "45", "12.50"]) {
      expect(tienePrecio(valor), String(valor)).toBe(true);
    }
  });
});

describe("calcularPrecioProducto sin precio", () => {
  const destino = { productoId: "producto-1", categoriaId: null };

  it("con nulo o 0 devuelve «sin precio», sin promoción ni ahorro", () => {
    for (const precio of [null, 0]) {
      expect(calcularPrecioProducto(precio, destino, [PROMOCION])).toEqual({
        sinPrecio: true,
        precioOriginal: null,
        precioFinal: null,
        ahorro: 0,
        promocion: null,
      });
    }
  });

  it("con precio sigue aplicando la promoción", () => {
    const resultado = calcularPrecioProducto(20, destino, [PROMOCION]);
    expect(resultado.sinPrecio).toBe(false);
    expect(resultado.precioFinal).toBe(15);
    expect(resultado.promocion).toBe(PROMOCION);
  });
});

describe("validarProducto con el precio vacío", () => {
  const base = {
    nombre: "Placa 1P horizontal 4x2",
    descripcion: "",
    categoria_id: null,
    subcategoria_id: null,
    controla_stock: false,
  };

  it("vacío, nulo, 0 y «0» se guardan como nulo", () => {
    for (const precio of ["", "   ", null, 0, "0", "0,00"]) {
      const resultado = validarProducto({ ...base, precio });
      expect(resultado.correcto, JSON.stringify(precio)).toBe(true);
      if (resultado.correcto) expect(resultado.datos.precio).toBeNull();
    }
  });

  it("un precio escrito se guarda como siempre", () => {
    const resultado = validarProducto({ ...base, precio: "38,50" });
    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) expect(resultado.datos.precio).toBe(38.5);
  });

  it("un guardado al que le falta el campo no borra el precio: es un error", () => {
    const resultado = validarProducto(base);
    expect(resultado.correcto).toBe(false);
  });

  it("lo que no es un precio sigue siendo un error", () => {
    for (const precio of ["abc", -1, "1.999"]) {
      expect(validarProducto({ ...base, precio }).correcto, String(precio)).toBe(false);
    }
  });
});

describe("construirMensajeConsulta", () => {
  const mensaje = construirMensajeConsulta(
    "Ferrovolt",
    { nombre: "Placa 1P horizontal 4x2" },
    "https://mi-puesto.com/ferrovolt/p/PRD-1",
  );

  it("dice el texto del plan, con el enlace al producto", () => {
    expect(mensaje).toBe(
      "Hola, quiero consultar por este producto de Ferrovolt: Placa 1P horizontal 4x2.\n" +
        "https://mi-puesto.com/ferrovolt/p/PRD-1",
    );
  });

  it("no habla de precio, ni para decir que falta", () => {
    expect(mensaje).not.toMatch(/precio|Bs|cotiz|a consultar/i);
  });

  it("sin enlace, queda solo el saludo", () => {
    expect(construirMensajeConsulta("Ferrovolt", { nombre: "Placa" })).toBe(
      "Hola, quiero consultar por este producto de Ferrovolt: Placa.",
    );
  });
});

describe("el ajuste masivo salta los sin precio", () => {
  it("no manda cambios para nulo ni para 0", () => {
    expect(
      cambiosDeAjuste(
        [
          { id: "a", precio: null },
          { id: "b", precio: 0 },
          { id: "c", precio: "0" },
          { id: "d", precio: 100 },
        ],
        10,
      ).map(({ id }) => id),
    ).toEqual(["d"]);
  });
});

/* Un cliente de la base de mentira, que devuelve siempre la misma fila. Alcanza
   para `obtenerProductoAgendable`, que hace una sola consulta. */
function baseConFila(fila: Record<string, unknown>) {
  const cadena: Record<string, unknown> = {};
  for (const metodo of ["from", "select", "eq", "is"]) cadena[metodo] = () => cadena;
  cadena.maybeSingle = async () => ({ data: fila, error: null });
  return cadena as unknown as SupabaseClient;
}

describe("un servicio sin precio no se agenda en línea (decisión 3)", () => {
  const servicio = {
    id: "producto-1",
    nombre: "Baño y corte",
    duracion_minutos: null,
    categoria_id: "categoria-1",
    recurso_id: "recurso-1",
    visible: true,
    categorias: { vende: "tiempo" },
    recursos: {
      activo: true,
      acepta_reservas: true,
      agenda_recurso: {
        duracion_minutos: 30,
        cupo_por_franja: 1,
        anticipacion_minima_horas: 2,
        dias_maximos: 30,
        franjas: [{ dia: 1, desde: "08:30", hasta: "12:00" }],
      },
    },
  };

  it("con precio, se agenda", async () => {
    const producto = await obtenerProductoAgendable(
      baseConFila({ ...servicio, precio: 80 }),
      "negocio-1",
      "producto-1",
    );
    expect(producto?.precio).toBe(80);
  });

  it("sin precio, la ruta de citas recibe «acá no se agenda»", async () => {
    for (const precio of [null, 0]) {
      expect(
        await obtenerProductoAgendable(baseConFila({ ...servicio, precio }), "negocio-1", "producto-1"),
      ).toBeNull();
    }
  });
});
