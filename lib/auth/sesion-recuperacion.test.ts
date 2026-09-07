import { describe, expect, it } from "vitest";

import { esSesionDeRecuperacion } from "./sesion-recuperacion";

describe("sesión abierta desde el enlace del correo", () => {
  it("la reconoce en los dos formatos que usa Supabase", () => {
    expect(esSesionDeRecuperacion({ amr: ["recovery"] })).toBe(true);
    expect(esSesionDeRecuperacion({ amr: [{ method: "recovery" }] })).toBe(true);
  });

  it("no marca como recuperación a quien entró con su contraseña", () => {
    expect(esSesionDeRecuperacion({ amr: ["password"] })).toBe(false);
    expect(
      esSesionDeRecuperacion({ amr: [{ method: "recovery" }, { method: "password" }] }),
    ).toBe(false);
  });

  /* Equivocarse para este lado deja gente afuera de su propio panel, así que
     ante la duda se asume sesión completa. */
  it("ante la duda, la trata como sesión completa", () => {
    expect(esSesionDeRecuperacion({})).toBe(false);
    expect(esSesionDeRecuperacion({ amr: [] })).toBe(false);
    expect(esSesionDeRecuperacion(null)).toBe(false);
    expect(esSesionDeRecuperacion({ amr: "recovery" })).toBe(false);
  });
});
