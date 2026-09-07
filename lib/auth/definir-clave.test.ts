import { describe, expect, it, vi } from "vitest";

import { canjearEnlace, definirClaveConToken } from "./definir-clave";

const URL_BASE = "https://proyecto.supabase.co";

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve({
    ok: estado >= 200 && estado < 300,
    status: estado,
    json: () => Promise.resolve(cuerpo),
  } as Response);
}

describe("canje del enlace", () => {
  it("devuelve los dos tokens cuando el canje anda", async () => {
    vi.stubGlobal("fetch", () =>
      respuesta(200, { access_token: "a", refresh_token: "r" }),
    );
    await expect(canjearEnlace(URL_BASE, "clave", "hash", "recovery")).resolves.toEqual({
      correcto: true,
      accessToken: "a",
      refreshToken: "r",
    });
    vi.unstubAllGlobals();
  });

  /* Una respuesta 200 sin tokens es un fallo, no un éxito: dar por buena esa
     respuesta fue lo que hizo aparecer el error recién al guardar. */
  it("trata como fallo un 200 sin tokens", async () => {
    vi.stubGlobal("fetch", () => respuesta(200, {}));
    const resultado = await canjearEnlace(URL_BASE, "clave", "hash", "recovery");
    expect(resultado.correcto).toBe(false);
    vi.unstubAllGlobals();
  });

  it("conserva el motivo que manda Supabase", async () => {
    vi.stubGlobal("fetch", () => respuesta(403, { error_code: "otp_expired" }));
    const resultado = await canjearEnlace(URL_BASE, "clave", "hash", "recovery");
    expect(resultado.correcto === false && resultado.motivo).toContain("otp_expired");
    vi.unstubAllGlobals();
  });
});

describe("cambio de contraseña", () => {
  it("acepta el cambio cuando la API responde bien", async () => {
    vi.stubGlobal("fetch", () => respuesta(200, {}));
    await expect(definirClaveConToken(URL_BASE, "clave", "token", "unaClaveLarga")).resolves
      .toEqual({ correcto: true, motivo: "" });
    vi.unstubAllGlobals();
  });

  it("traduce los dos motivos que la persona puede resolver sola", async () => {
    vi.stubGlobal("fetch", () => respuesta(422, { error_code: "same_password" }));
    const repetida = await definirClaveConToken(URL_BASE, "clave", "token", "x");
    expect(repetida.motivo).toContain("ya tenías");
    vi.unstubAllGlobals();
  });

  /* Un mensaje inventado ya costó tres días de buscar en el lugar equivocado:
     lo que no se reconoce se muestra tal como vino. */
  it("muestra el error crudo cuando no lo reconoce", async () => {
    vi.stubGlobal("fetch", () => respuesta(401, { msg: "Invalid token" }));
    const otro = await definirClaveConToken(URL_BASE, "clave", "token", "x");
    expect(otro.motivo).toBe("Invalid token (401)");
    vi.unstubAllGlobals();
  });
});
