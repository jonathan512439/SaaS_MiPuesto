import { describe, expect, it } from "vitest";

import { esLimiteDeCorreo, mensajeDeEspera, segundosDeEspera } from "./espera-correo";

describe("límite de envío de correos", () => {
  it("reconoce el 429 por sus dos formas", () => {
    expect(esLimiteDeCorreo({ status: 429 })).toBe(true);
    expect(esLimiteDeCorreo({ code: "over_email_send_rate_limit" })).toBe(true);
    expect(esLimiteDeCorreo({ status: 500 })).toBe(false);
    expect(esLimiteDeCorreo(null)).toBe(false);
  });

  /* Decir cuántos segundos faltan permite decidir si conviene esperar; «espera
     un rato» no. */
  it("rescata los segundos del mensaje de Supabase", () => {
    expect(
      segundosDeEspera({ message: "For security purposes, you can only request this after 22 seconds." }),
    ).toBe(22);
    expect(segundosDeEspera({ message: "otra cosa" })).toBe(0);
  });

  it("dice cuánto falta cuando lo sabe", () => {
    expect(mensajeDeEspera({ message: "you can only request this after 18 seconds" })).toContain(
      "18 segundos",
    );
    expect(mensajeDeEspera({ status: 429 })).toContain("unos minutos");
  });
});
