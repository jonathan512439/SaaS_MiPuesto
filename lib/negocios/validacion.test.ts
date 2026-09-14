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
        subnombre: null,
        tipo_negocio: "catalogo_cta",
        telefono_whatsapp: "59171234567",
        rubro: null,
        pide_numero_mesa: false,
        ciudad: null,
        zona: null,
      },
    });
  });

  it("recorta el renglón bajo el nombre y lo deja nulo si viene vacío", () => {
    const base = {
      nombre: "Café Illimani",
      slug: "cafe-illimani",
      tipo_negocio: "catalogo_cta",
      telefono_whatsapp: "+591 7123-4567",
    };
    const conSubnombre = validarDatosNegocio({ ...base, subnombre: "  Desde 1998 " });
    expect(conSubnombre.correcto && conSubnombre.datos.subnombre).toBe("Desde 1998");

    const vacio = validarDatosNegocio({ ...base, subnombre: "   " });
    expect(vacio.correcto && vacio.datos.subnombre).toBeNull();
  });

  it("rechaza un renglón bajo el nombre larguisimo en vez de cortarlo callado", () => {
    const resultado = validarDatosNegocio({
      nombre: "Café Illimani",
      slug: "cafe-illimani",
      tipo_negocio: "catalogo_cta",
      telefono_whatsapp: "+591 7123-4567",
      subnombre: "s".repeat(61),
    });
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores.subnombre).toContain("60");
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

describe("rubro del negocio", () => {
  const base = {
    nombre: "Café Illimani",
    slug: "cafe-illimani",
    descripcion: "",
    tipo_negocio: "catalogo_cta",
    telefono_whatsapp: "71234567",
  };

  it("acepta un rubro de la lista", () => {
    const resultado = validarDatosNegocio({ ...base, rubro: "restaurante" });
    expect(resultado.correcto && resultado.datos.rubro).toBe("restaurante");
  });

  /* Vacío significa «no lo dijo» y es un valor legítimo: quien no elige rubro ve
     el panel completo. */
  it("trata el vacío como no elegido", () => {
    const resultado = validarDatosNegocio({ ...base, rubro: "" });
    expect(resultado.correcto && resultado.datos.rubro).toBe(null);
  });

  it("rechaza un rubro inventado antes de que lo haga la base", () => {
    const resultado = validarDatosNegocio({ ...base, rubro: "panaderia" });
    expect(resultado.correcto).toBe(false);
    expect(!resultado.correcto && resultado.errores.rubro).toBeTruthy();
  });
});

describe("ciudad y zona", () => {
  const base = {
    nombre: "Café Illimani",
    slug: "cafe-illimani",
    descripcion: "",
    tipo_negocio: "catalogo_cta",
    telefono_whatsapp: "71234567",
  };

  it("guarda la ciudad de la lista y la zona libre", () => {
    const resultado = validarDatosNegocio({
      ...base,
      ciudad: "cochabamba",
      zona: " Cala Cala ",
    });
    expect(resultado.correcto && resultado.datos.ciudad).toBe("cochabamba");
    expect(resultado.correcto && resultado.datos.zona).toBe("Cala Cala");
  });

  it("rechaza una ciudad fuera de la lista", () => {
    const resultado = validarDatosNegocio({ ...base, ciudad: "beni" });
    expect(resultado.correcto).toBe(false);
  });

  it("trata el vacío como no informado", () => {
    const resultado = validarDatosNegocio({ ...base, ciudad: "", zona: "" });
    expect(resultado.correcto && resultado.datos.ciudad).toBe(null);
    expect(resultado.correcto && resultado.datos.zona).toBe(null);
  });
});
