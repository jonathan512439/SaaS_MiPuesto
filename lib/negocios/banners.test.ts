import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MAXIMO_BANNERS, PROPORCION_BANNER, leerBanners, validarBanners } from "./banners";

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
      /* El segundo lugar, vacío: el arreglo tiene siempre dos y el hueco es
         parte de la respuesta, no algo que se recorta. */
      null,
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
    if (!banner) throw new Error("el primer lugar viene con banner");
    expect(banner.eyebrow).toBe("Solo esta semana");
    expect(banner.titulo).toBe("20 % en toda la línea eléctrica");
    expect(banner.copy).toBe("Del lunes al sábado, presentando el catálogo.");
    expect(banner.boton).toBe("Ver la promoción");
    expect(leerBanners([{ ...bueno, titulo: "t".repeat(200) }])[0]?.titulo).toHaveLength(80);
  });

  it("deja en nulo el texto de encima que no vino", () => {
    const [banner] = leerBanners([bueno]);
    if (!banner) throw new Error("el primer lugar viene con banner");
    expect(banner.titulo).toBeNull();
    expect(banner.boton).toBeNull();
  });

  it("acepta un banner sin enlace: un aviso no lleva a ninguna parte", () => {
    expect(leerBanners([{ imagen: bueno.imagen, alt: "Cerrado el 6 de agosto" }])[0]?.enlace).toBeNull();
  });

  /* Los descartes son en silencio a propósito: esta función lee lo que ya está
     guardado, y un banner mal formado no puede dejar el catálogo sin cargar.
     Lo que se descarta deja su lugar **vacío**, no corre al de abajo. */
  it("descarta el que no tiene imagen o no tiene texto alternativo", () => {
    expect(leerBanners([{ alt: "Sin imagen" }])).toEqual([null, null]);
    expect(leerBanners([{ imagen: bueno.imagen }])).toEqual([null, null]);
    expect(leerBanners([{ imagen: bueno.imagen, alt: "   " }])).toEqual([null, null]);
  });

  /* La ruta se descarta si podría salirse del depósito. Que además sea de este
     negocio lo comprueba el servidor, que es donde se sabe cuál es. */
  it("descarta rutas que podrían salirse del depósito", () => {
    expect(leerBanners([{ ...bueno, imagen: "../otro-negocio/banner/x.webp" }])).toEqual([null, null]);
    expect(leerBanners([{ ...bueno, imagen: "/etc/passwd" }])).toEqual([null, null]);
    expect(leerBanners([{ ...bueno, imagen: "carpeta\\archivo.webp" }])).toEqual([null, null]);
    expect(leerBanners([{ ...bueno, imagen: "x".repeat(400) }])).toEqual([null, null]);
  });

  it("descarta enlaces que no son https", () => {
    expect(leerBanners([{ ...bueno, enlace: "javascript:alert(1)" }])[0]?.enlace).toBeNull();
    expect(leerBanners([{ ...bueno, enlace: "http://ejemplo.com" }])[0]?.enlace).toBeNull();
  });

  it("nunca devuelve más del tope, aunque la columna traiga más", () => {
    expect(leerBanners([bueno, bueno, bueno, bueno])).toHaveLength(MAXIMO_BANNERS);
  });

  it("no rompe con lo que no es una lista", () => {
    expect(leerBanners(null)).toEqual([null, null]);
    expect(leerBanners("dos banners")).toEqual([null, null]);
    expect(leerBanners([null, 7, "x"])).toEqual([null, null]);
  });

  it("recorta un texto alternativo larguísimo en vez de descartarlo", () => {
    const largo = leerBanners([{ ...bueno, alt: "a".repeat(500) }]);
    expect(largo[0]?.alt).toHaveLength(120);
  });
});

describe("validarBanners", () => {
  it("acepta una lista vacía, que es lo normal", () => {
    expect(validarBanners([])).toEqual({ correcto: true, banners: [] });
    expect(validarBanners(undefined)).toEqual({ correcto: true, banners: [] });
  });

  it("acepta los dos bien formados", () => {
    expect(validarBanners([bueno, { imagen: bueno.imagen, alt: "Aviso" }]).correcto).toBe(true);
  });

  /* Tres franjas de publicidad en un catálogo de barrio es un catálogo que no se
     lee. El techo está acá y no solo en el formulario. */
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

/* La proporción del banner se dice en dos lugares y tiene que ser una sola.
 *
 * El panel le promete al dueño una forma —«2:1, por ejemplo 1200 × 600»— y la
 * hoja de estilos decide la forma de verdad. Si alguien retoca el CSS porque la
 * franja le parece baja y no toca el texto, el dueño sigue preparando imágenes
 * con la proporción vieja y el catálogo se las recorta por el medio, sin avisar
 * a nadie: la imagen entra, se ve, y le falta un pedazo.
 *
 * No se puede importar un número desde un módulo de CSS, así que se lee el
 * archivo. */
describe("la proporción del banner", () => {
  const hoja = readFileSync(
    join(import.meta.dirname, "..", "..", "components", "templates", "banner-catalogo.module.css"),
    "utf8",
  );

  it("es la misma en la hoja de estilos que en el panel", () => {
    expect(hoja).toContain(`--banner-ancho: ${PROPORCION_BANNER.ancho};`);
    expect(hoja).toContain(`--banner-alto: ${PROPORCION_BANNER.alto};`);
  });

  it("sale de esos dos números y no de otro escrito a mano", () => {
    /* Que la declaren, no que la repitan: un `aspect-ratio: 5 / 2` suelto sería
       otra copia del mismo dato. */
    expect(hoja).toContain("aspect-ratio: var(--banner-ancho) / var(--banner-alto);");
    expect(hoja).not.toMatch(/aspect-ratio:\s*\d/);
  });

  it("le da al dueño una medida en píxeles que la cumple", () => {
    /* El ejemplo es lo único que la mayoría va a mirar. Si no cumple la
       proporción que la misma frase anuncia, enseña a equivocarse. */
    const [ancho, alto] = PROPORCION_BANNER.ejemplo.match(/\d+/g)!.map(Number);
    expect(ancho / alto).toBe(PROPORCION_BANNER.ancho / PROPORCION_BANNER.alto);
  });
});
