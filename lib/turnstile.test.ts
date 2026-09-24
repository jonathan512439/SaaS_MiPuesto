import { afterEach, describe, expect, it, vi } from "vitest";

import {
  decidirConTurnstile,
  leerModoTurnstile,
  leerSecretoTurnstile,
  verificarTurnstile,
} from "./turnstile";

const SECRETO = "0x4AAAAAAA-secreto-de-prueba-00000000";

function respuesta(cuerpo: unknown, estado = 200) {
  return vi.fn(async () => new Response(JSON.stringify(cuerpo), { status: estado }));
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("la verificación de que lo envía una persona", () => {
  it("con un token que Cloudflare acepta, pasa verificado", async () => {
    const pedir = respuesta({ success: true });
    expect(await verificarTurnstile("token-bueno", "200.87.1.2", SECRETO, pedir)).toEqual({
      permitido: true,
      verificado: true,
    });
    const [, opciones] = pedir.mock.calls[0] as unknown as [string, RequestInit];
    const enviado = opciones.body as URLSearchParams;
    expect(enviado.get("secret")).toBe(SECRETO);
    expect(enviado.get("response")).toBe("token-bueno");
    expect(enviado.get("remoteip")).toBe("200.87.1.2");
  });

  it("sin token se rechaza sin preguntarle a nadie: es lo que haría un programa", async () => {
    const pedir = respuesta({ success: true });
    for (const token of [undefined, null, "", "   ", 42, "x".repeat(2_049)]) {
      expect(await verificarTurnstile(token, "200.87.1.2", SECRETO, pedir)).toMatchObject({
        permitido: false,
      });
    }
    expect(pedir).not.toHaveBeenCalled();
  });

  it("un token vencido o ya usado se rechaza", async () => {
    const resultado = await verificarTurnstile(
      "token-usado",
      "200.87.1.2",
      SECRETO,
      respuesta({ success: false, "error-codes": ["timeout-or-duplicate"] }),
    );
    expect(resultado).toEqual({ permitido: false, motivo: "timeout-or-duplicate" });
  });

  it("si Cloudflare no contesta, se deja pasar sin verificar", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const caido = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await verificarTurnstile("token", "200.87.1.2", SECRETO, caido)).toEqual({
      permitido: true,
      verificado: false,
    });
    expect(await verificarTurnstile("token", "200.87.1.2", SECRETO, respuesta({}, 503))).toEqual({
      permitido: true,
      verificado: false,
    });
  });

  it("una clave secreta mal cargada rechaza y lo anota fuerte", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const resultado = await verificarTurnstile(
      "token",
      "200.87.1.2",
      SECRETO,
      respuesta({ success: false, "error-codes": ["invalid-input-secret"] }),
    );
    expect(resultado).toMatchObject({ permitido: false });
    expect(error).toHaveBeenCalled();
  });

  it("en desarrollo no manda una IP que no es real", async () => {
    const pedir = respuesta({ success: true });
    await verificarTurnstile("token", "entorno-local", SECRETO, pedir);
    const [, opciones] = pedir.mock.calls[0] as unknown as [string, RequestInit];
    expect((opciones.body as URLSearchParams).has("remoteip")).toBe(false);
  });
});

describe("la clave secreta de Turnstile", () => {
  it("sin ella no se verifica con nada: falla", () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(() => leerSecretoTurnstile()).toThrow(/TURNSTILE_SECRET_KEY/);
  });

  it("con ella, la devuelve", () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", SECRETO);
    expect(leerSecretoTurnstile()).toBe(SECRETO);
  });
});

describe("el modo: exigir u observar", () => {
  it("sin la variable se exige: el modo seguro no depende de acordarse", () => {
    vi.stubEnv("TURNSTILE_MODO", "");
    expect(leerModoTurnstile()).toBe("exigir");
    vi.stubEnv("TURNSTILE_MODO", "cualquier-cosa");
    expect(leerModoTurnstile()).toBe("exigir");
    vi.stubEnv("TURNSTILE_MODO", "observar");
    expect(leerModoTurnstile()).toBe("observar");
  });

  it("exigiendo, lo rechazado se rechaza", () => {
    expect(decidirConTurnstile({ permitido: false, motivo: "sin-token" }, "exigir", "pedido")).toBe(false);
    expect(decidirConTurnstile({ permitido: true, verificado: true }, "exigir", "pedido")).toBe(true);
  });

  it("observando, pasa todo pero se anota qué habría pasado", () => {
    const anotado = vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(decidirConTurnstile({ permitido: false, motivo: "sin-token" }, "observar", "pedido")).toBe(true);
    expect(anotado).toHaveBeenCalledWith(expect.stringContaining("se habría rechazado (sin-token)"));
    decidirConTurnstile({ permitido: true, verificado: true }, "observar", "reserva");
    expect(anotado).toHaveBeenCalledWith(expect.stringContaining("reserva): verificado"));
  });
});
