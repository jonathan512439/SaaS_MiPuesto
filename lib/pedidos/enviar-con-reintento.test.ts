import { describe, expect, it, vi } from "vitest";

import { INTENTOS_MAXIMOS, enviarConReintento } from "./enviar-con-reintento";

const sinEsperar = async () => undefined;

function json(cuerpo: unknown, estado: number) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "content-type": "application/json" },
  });
}

/* La página que devuelve Cloudflare cuando corta el Worker: HTML, no JSON. */
function paginaDeCorte() {
  return new Response("<html><body>Error 1102: Worker exceeded resource limits</body></html>", {
    status: 503,
    headers: { "content-type": "text/html" },
  });
}

describe("enviar un pedido sin que un corte se lea como «falló»", () => {
  it("si contesta bien a la primera, no se repite", async () => {
    const enviar = vi.fn(async () => json({ pedido: { codigo: "PED-1" } }, 201));
    expect(await enviarConReintento(enviar, sinEsperar)).toEqual({
      tipo: "respuesta",
      estado: 201,
      datos: { pedido: { codigo: "PED-1" } },
    });
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it("el corte de Cloudflare después de crear el pedido: se pregunta de nuevo y vuelve el mismo", async () => {
    const enviar = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(paginaDeCorte())
      .mockResolvedValueOnce(json({ pedido: { codigo: "PED-1", repetido: true } }, 200));
    expect(await enviarConReintento(enviar, sinEsperar)).toMatchObject({
      tipo: "respuesta",
      estado: 200,
      datos: { pedido: { codigo: "PED-1", repetido: true } },
    });
    expect(enviar).toHaveBeenCalledTimes(2);
  });

  it("la red que se cae también se reintenta", async () => {
    const enviar = vi
      .fn<() => Promise<Response>>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(json({ pedido: { codigo: "PED-2" } }, 201));
    expect(await enviarConReintento(enviar, sinEsperar)).toMatchObject({ tipo: "respuesta", estado: 201 });
  });

  it("un 403 de la verificación se reintenta: suele ser un token vencido", async () => {
    const enviar = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(json({ error: "No pudimos comprobar el envío." }, 403))
      .mockResolvedValueOnce(json({ pedido: { codigo: "PED-3" } }, 201));
    expect(await enviarConReintento(enviar, sinEsperar)).toMatchObject({ estado: 201 });
  });

  it("un error de la aplicación no se repite: daría la misma respuesta", async () => {
    for (const estado of [400, 404, 409, 429]) {
      const enviar = vi.fn(async () => json({ error: "No hay stock." }, estado));
      expect(await enviarConReintento(enviar, sinEsperar)).toMatchObject({ tipo: "respuesta", estado });
      expect(enviar).toHaveBeenCalledTimes(1);
    }
  });

  it("si nunca llega una respuesta legible, lo dice así y no inventa un resultado", async () => {
    const enviar = vi.fn(async () => paginaDeCorte());
    expect(await enviarConReintento(enviar, sinEsperar)).toEqual({
      tipo: "sin_respuesta",
      motivo: "cuerpo-ilegible-503",
    });
    expect(enviar).toHaveBeenCalledTimes(INTENTOS_MAXIMOS);
  });

  it("espera un poco más en cada intento", async () => {
    const esperas: number[] = [];
    await enviarConReintento(
      async () => paginaDeCorte(),
      async (ms) => {
        esperas.push(ms);
      },
    );
    expect(esperas).toHaveLength(INTENTOS_MAXIMOS - 1);
    expect(esperas[1]).toBeGreaterThan(esperas[0]);
  });
});
