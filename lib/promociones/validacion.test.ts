import { describe, expect, it } from "vitest";

import { validarPromocion } from "./validacion";

const ID = "10000000-0000-4000-8000-000000000001";

describe("validarPromocion", () => {
  it("normaliza una promoción de producto", () => {
    expect(
      validarPromocion({
        tipo: "porcentaje",
        valor: "15,5",
        destino: "producto",
        destino_id: ID,
        fecha_inicio: "2026-09-03T12:00:00-04:00",
        fecha_fin: "2026-09-04T12:00:00-04:00",
      }),
    ).toEqual({
      correcto: true,
      datos: {
        activo: true,
      hora_inicio: null,
      hora_fin: null,
      dias: null,
        categoria_id: null,
        fecha_fin: "2026-09-04T16:00:00.000Z",
        fecha_inicio: "2026-09-03T16:00:00.000Z",
        producto_id: ID,
        tipo: "porcentaje",
        valor: 15.5,
      },
    });
  });

  it("rechaza porcentajes mayores a cien y fechas invertidas", () => {
    const resultado = validarPromocion({
      tipo: "porcentaje",
      valor: 101,
      destino: "categoria",
      destino_id: ID,
      fecha_inicio: "2026-09-04T12:00:00.000Z",
      fecha_fin: "2026-09-03T12:00:00.000Z",
    });

    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) {
      expect(resultado.errores).toHaveProperty("valor");
      expect(resultado.errores).toHaveProperty("fecha_fin");
    }
  });

  it("rechaza destinos e importes inválidos", () => {
    const resultado = validarPromocion({
      tipo: "monto_fijo",
      valor: -1,
      destino: "producto",
      destino_id: "otro",
    });

    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) {
      expect(resultado.errores).toHaveProperty("valor");
      expect(resultado.errores).toHaveProperty("destino_id");
    }
  });
});

describe("horario de la promoción", () => {
  const base = {
    tipo: "porcentaje",
    valor: "20",
    destino: "producto",
    destino_id: "50000000-0000-4000-8000-000000000001",
  };

  it("guarda la ventana con segundos, como la columna", () => {
    const resultado = validarPromocion({
      ...base,
      hora_inicio: "12:00",
      hora_fin: "14:30",
      dias: [3, 1, 1],
    });
    expect(resultado.correcto && resultado.datos.hora_inicio).toBe("12:00:00");
    expect(resultado.correcto && resultado.datos.hora_fin).toBe("14:30:00");
    expect(resultado.correcto && resultado.datos.dias).toEqual([1, 3]);
  });

  /* Una sola hora no define ninguna ventana. La base lo rechaza con un check;
     acá se avisa con algo que el dueño entiende. */
  it("rechaza media ventana", () => {
    const resultado = validarPromocion({ ...base, hora_inicio: "12:00" });
    expect(resultado.correcto).toBe(false);
    expect(!resultado.correcto && resultado.errores.horario).toBeTruthy();
  });

  it("rechaza una ventana de largo cero y un día inexistente", () => {
    expect(
      validarPromocion({ ...base, hora_inicio: "12:00", hora_fin: "12:00" }).correcto,
    ).toBe(false);
    expect(validarPromocion({ ...base, dias: [7] }).correcto).toBe(false);
  });

  it("acepta una ventana que cruza la medianoche", () => {
    const resultado = validarPromocion({ ...base, hora_inicio: "22:00", hora_fin: "02:00" });
    expect(resultado.correcto).toBe(true);
  });
});
