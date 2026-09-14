import { describe, expect, it } from "vitest";

import { MAXIMO_BANNERS, leerBanners, validarBanners } from "./banners";

const bueno = {
  /* Una ruta del depósito, no una dirección: guardar la dirección completa
     hornearía el proyecto de Supabase adentro del dato. */
  imagen: "11111111-1111-4111-8111-111111111111/banner/promo.webp",
  alt: "20 % de descuento toda la semana",
  enlace: "https://mipuesto.com/promo",
};

describe("leerBanners", () => {
  it("lee uno bien formado", () => {
    expect(leerBanners([bueno])).toEqual([
      {
        imagen: bueno.imagen,
        alt: bueno.alt,
        eyebrow: null,
        titulo: null,
        copy: null,
        boton: null,
        enlace: bueno.enlace,
      },
    ]);
  });

  it("lee el texto de encima cuando viene, y lo recorta a su techo", () => {
    const [banner] = leerBanners([
      {
        ...bueno,
        eyebrow: "Solo esta semana",
        titulo: "20 % en toda la línea eléctrica",
        copy: "Del lunes al sábado, presentando el catálogo.",
        boton: "Ver la promoción",
      },
    ]);
    expect(banner.eyebrow).toBe("Solo esta semana");
    expect(banner.titulo).toBe("20 % en toda la línea eléctrica");
    expect(banner.copy).toBe("Del lunes al sábado, presentando el catálogo.");
    expect(banner.boton).toBe("Ver la promoción");
    expect(leerBanners([{ ...bueno, titulo: "t".repeat(200) }])[0].titulo).toHaveLength(80);
  });

  it("deja en nulo el texto de encima que no vino", () => {
    const [banner] = leerBanners([bueno]);
    expect(banner.titulo).toBeNull();
    expect(banner.boton).toBeNull();
  });

  it("acepta un banner sin enlace: un aviso no lleva a ninguna parte", () => {
    expect(leerBanners([{ imagen: bueno.imagen, alt: "Cerrado el 6 de agosto" }])[0].enlace).toBeNull();
  });

  /* Los descartes son en silencio a propósito: esta función lee lo que ya está
     guardado, y un banner mal formado no puede dejar el catálogo sin cargar. */
  it("descarta el que no tiene imagen o no tiene texto alternativo", () => {
    expect(leerBanners([{ alt: "Sin imagen" }])).toEqual([]);
    expect(leerBanners([{ imagen: bueno.imagen }])).toEqual([]);
    expect(leerBanners([{ imagen: bueno.imagen, alt: "   " }])).toEqual([]);
  });

  /* La ruta se descarta si podría salirse del depósito. Que además sea de este
     negocio lo comprueba el servidor, que es donde se sabe cuál es. */
  it("descarta rutas que podrían salirse del depósito", () => {
    expect(leerBanners([{ ...bueno, imagen: "../otro-negocio/banner/x.webp" }])).toEqual([]);
    expect(leerBanners([{ ...bueno, imagen: "/etc/passwd" }])).toEqual([]);
    expect(leerBanners([{ ...bueno, imagen: "carpeta\\archivo.webp" }])).toEqual([]);
    expect(leerBanners([{ ...bueno, imagen: "x".repeat(400) }])).toEqual([]);
  });

  it("descarta enlaces que no son https", () => {
    expect(leerBanners([{ ...bueno, enlace: "javascript:alert(1)" }])[0].enlace).toBeNull();
    expect(leerBanners([{ ...bueno, enlace: "http://ejemplo.com" }])[0].enlace).toBeNull();
  });

  it("nunca devuelve más de dos, aunque la columna traiga más", () => {
    expect(leerBanners([bueno, bueno, bueno, bueno])).toHaveLength(MAXIMO_BANNERS);
  });

  it("no rompe con lo que no es una lista", () => {
    expect(leerBanners(null)).toEqual([]);
    expect(leerBanners("dos banners")).toEqual([]);
    expect(leerBanners([null, 7, "x"])).toEqual([]);
  });

  it("recorta un texto alternativo larguísimo en vez de descartarlo", () => {
    const largo = leerBanners([{ ...bueno, alt: "a".repeat(500) }]);
    expect(largo[0].alt).toHaveLength(120);
  });
});

describe("validarBanners", () => {
  it("acepta una lista vacía, que es lo normal", () => {
    expect(validarBanners([])).toEqual({ correcto: true, banners: [] });
    expect(validarBanners(undefined)).toEqual({ correcto: true, banners: [] });
  });

  it("acepta dos bien formados", () => {
    const resultado = validarBanners([bueno, { imagen: bueno.imagen, alt: "Aviso" }]);
    expect(resultado.correcto).toBe(true);
  });

  it("rechaza el tercero", () => {
    const resultado = validarBanners([bueno, bueno, bueno]);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores.banners).toContain("hasta 2");
  });

  /* Acá sí se avisa, y con el índice adentro de la clave, para que el
     formulario pueda marcar el banner exacto. */
  it("dice cuál banner está mal y por qué", () => {
    const resultado = validarBanners([bueno, { imagen: "", alt: "" }]);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) {
      expect(resultado.errores["banners.1.imagen"]).toBeTruthy();
      expect(resultado.errores["banners.1.alt"]).toBeTruthy();
      expect(resultado.errores["banners.0.imagen"]).toBeUndefined();
    }
  });

  it("explica que el enlace tiene que ser https, en vez de descartarlo callado", () => {
    const resultado = validarBanners([{ ...bueno, enlace: "http://ejemplo.com" }]);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) {
      expect(resultado.errores["banners.0.enlace"]).toContain("https://");
    }
  });

  it("no se queja del enlace vacío", () => {
    expect(validarBanners([{ imagen: bueno.imagen, alt: "Aviso", enlace: "" }]).correcto).toBe(true);
  });
});
