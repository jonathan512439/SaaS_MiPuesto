import { describe, expect, it } from "vitest";

import {
  normalizarTelefonoWhatsapp,
  proponerSlug,
  validarDatosNegocio,
  validarSlug,
} from "./validacion";

describe("validación del perfil de negocio", () => {
  it("acepta y normaliza datos válidos", () => {
    expect(
      validarDatosNegocio({
        nombre: "  Café Illimani ",
        slug: "cafe-illimani",
        descripcion: " Café de especialidad. ",
        tipo_negocio: "catalogo_cta",
        telefono_whatsapp: "+591 7123-4567",
      }),
    ).toEqual({
      correcto: true,
      datos: {
        nombre: "Café Illimani",
        slug: "cafe-illimani",
        descripcion: "Café de especialidad.",
        tipo_negocio: "catalogo_cta",
        telefono_whatsapp: "59171234567",
      },
    });
  });

  it.each(["Admin", "api", "directorio", "login", "estilos"])(
    "rechaza el slug reservado %s",
    (slug) => {
      expect(validarSlug(slug.toLowerCase())).toContain("reservado");
    },
  );

  it.each(["mi negocio", "-negocio", "negocio-", "Negocio", "área"])(
    "rechaza el formato de slug %s",
    (slug) => {
      expect(validarSlug(slug)).not.toBe("");
    },
  );

  it("rechaza modalidad, longitud y teléfono inválidos", () => {
    const resultado = validarDatosNegocio({
      nombre: "A",
      slug: "ok",
      descripcion: "x".repeat(501),
      tipo_negocio: "otro",
      telefono_whatsapp: "123",
    });

    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) {
      expect(Object.keys(resultado.errores)).toEqual([
        "nombre",
        "slug",
        "descripcion",
        "tipo_negocio",
        "telefono_whatsapp",
      ]);
    }
  });

  it("agrega el código de Bolivia a un celular local", () => {
    expect(normalizarTelefonoWhatsapp("71234567")).toBe("59171234567");
  });

  it("propone un slug legible a partir del nombre", () => {
    expect(proponerSlug("Café & Panadería Illimani")).toBe(
      "cafe-panaderia-illimani",
    );
  });
});
