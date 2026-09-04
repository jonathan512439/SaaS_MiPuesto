import { describe, expect, it } from "vitest";

import { WHATSAPP_MIPUESTO, construirEnlaceContacto } from "./contacto";

describe("construirEnlaceContacto", () => {
  it("usa el número con código de país y sin signos", () => {
    expect(WHATSAPP_MIPUESTO).toMatch(/^591\d{8}$/);
  });

  it("escapa el mensaje para que los acentos y espacios viajen enteros", () => {
    const enlace = construirEnlaceContacto("Quiero mi catálogo de MiPuesto");
    expect(enlace).toBe(
      "https://wa.me/59161832872?text=Quiero%20mi%20cat%C3%A1logo%20de%20MiPuesto",
    );
  });

  it("no rompe el enlace cuando el mensaje trae signos de interrogación", () => {
    expect(construirEnlaceContacto("¿Cómo renuevo?")).not.toContain("?text=¿");
  });
});
