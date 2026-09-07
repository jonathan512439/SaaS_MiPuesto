import { describe, expect, it } from "vitest";

import { leerTokensDeUrl, limpiarUrl } from "./sesion-desde-url";

const BASE = "https://mipuesto.app/actualizar-clave";

describe("sesión que llega en la dirección", () => {
  /* Es la forma que manda Supabase en la recuperación, y la que el cliente
     rechazaba por creer que solo acepta PKCE. */
  it("lee los tokens del fragmento", () => {
    const resultado = leerTokensDeUrl(
      `${BASE}#access_token=abc&refresh_token=def&type=recovery`,
    );
    expect(resultado).toEqual({ tipo: "implicito", accessToken: "abc", refreshToken: "def" });
  });

  it("lee el código de la consulta", () => {
    expect(leerTokensDeUrl(`${BASE}?code=xyz`)).toEqual({ tipo: "codigo", codigo: "xyz" });
  });

  /* El error se mira antes que los tokens: si Supabase mandó uno, no hay sesión
     que rescatar y el motivo real está ahí. */
  it("prioriza el error sobre cualquier token", () => {
    const resultado = leerTokensDeUrl(
      `${BASE}#error_code=otp_expired&error_description=Email+link+is+invalid&access_token=abc&refresh_token=def`,
    );
    expect(resultado.tipo).toBe("error");
  });

  it("no inventa nada cuando la dirección viene limpia", () => {
    expect(leerTokensDeUrl(BASE)).toEqual({ tipo: "ninguno" });
    expect(leerTokensDeUrl("no es una direccion")).toEqual({ tipo: "ninguno" });
  });

  it("borra los tokens de la barra de direcciones", () => {
    expect(limpiarUrl(`${BASE}#access_token=abc&refresh_token=def`)).toBe(
      "/actualizar-clave",
    );
    expect(limpiarUrl(`${BASE}?code=xyz&motivo=pendiente`)).toBe(
      "/actualizar-clave?motivo=pendiente",
    );
  });
});
