import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  coordenadasDeEnlace,
  distanciaKm,
  esEnlaceDeMaps,
  estaEnBolivia,
  zonaMasCercana,
  type ZonaConCentro,
} from "./coordenadas";
import { cambiosDePresencia, validarPresencia } from "./presencia";
import { RUBROS } from "./rubros";
import {
  MAXIMO_RUBROS_SECUNDARIOS,
  RUBROS_PUBLICOS,
  leerRubrosSecundarios,
  siembraDeRubroPublico,
} from "./rubros-publicos";

const RAIZ = join(import.meta.dirname, "..", "..");
const MIGRACIONES = join(RAIZ, "supabase", "migrations");

function todasLasMigraciones(): string {
  return readdirSync(MIGRACIONES)
    .sort()
    .map((archivo) => readFileSync(join(MIGRACIONES, archivo), "utf8"))
    .join("\n");
}

describe("coordenadasDeEnlace", () => {
  it("lee el lugar marcado, que gana sobre el centro de la pantalla", () => {
    const enlace =
      "https://www.google.com/maps/place/Algo/@-17.9700,-67.1100,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-17.964712!4d-67.106398";
    expect(coordenadasDeEnlace(enlace)).toEqual({ lat: -17.964712, lng: -67.106398 });
  });

  it("lee el centro de la pantalla cuando no hay lugar marcado", () => {
    expect(coordenadasDeEnlace("https://www.google.com/maps/@-16.4955,-68.1336,15z")).toEqual({
      lat: -16.4955,
      lng: -68.1336,
    });
  });

  it("lee la consulta con coordenadas", () => {
    expect(coordenadasDeEnlace("https://maps.google.com/?q=-17.3895,-66.1568")).toEqual({
      lat: -17.3895,
      lng: -66.1568,
    });
  });

  it("no inventa un punto: sin coordenadas, o fuera de Bolivia, es nulo", () => {
    expect(coordenadasDeEnlace("https://maps.app.goo.gl/AbCdEf123")).toBeNull();
    expect(coordenadasDeEnlace(null)).toBeNull();
    expect(coordenadasDeEnlace("https://www.google.com/maps/@40.4168,-3.7038,15z")).toBeNull();
  });
});

/* La ruta que resuelve enlaces cortos sigue redirecciones. Sin una lista
   cerrada de dominios, sería una puerta para que el servidor pida cualquier
   dirección que alguien le pase. */
describe("esEnlaceDeMaps", () => {
  it("acepta los dominios de Google Maps, solo por https", () => {
    expect(esEnlaceDeMaps("https://maps.app.goo.gl/AbCdEf123")).toBe(true);
    expect(esEnlaceDeMaps("https://www.google.com/maps/place/x")).toBe(true);
    expect(esEnlaceDeMaps("https://maps.google.com/?q=1,2")).toBe(true);
  });

  it("rechaza todo lo demás", () => {
    expect(esEnlaceDeMaps("http://maps.app.goo.gl/AbCdEf123")).toBe(false);
    expect(esEnlaceDeMaps("https://www.google.com/search?q=x")).toBe(false);
    expect(esEnlaceDeMaps("https://maps.app.goo.gl.malo.com/x")).toBe(false);
    expect(esEnlaceDeMaps("https://169.254.169.254/latest")).toBe(false);
    expect(esEnlaceDeMaps("no es una dirección")).toBe(false);
  });
});

describe("la zona automática", () => {
  const ZONAS: ZonaConCentro[] = [
    { id: "centro", ciudad: "oruro", nombre: "Centro", latitud: -17.9647, longitud: -67.1064 },
    { id: "norte", ciudad: "oruro", nombre: "Zona Norte", latitud: -17.94, longitud: -67.11 },
    { id: "paz", ciudad: "la_paz", nombre: "Centro", latitud: -16.4955, longitud: -68.1336 },
  ];

  it("elige la más cercana de su ciudad", () => {
    expect(zonaMasCercana({ lat: -17.9655, lng: -67.107 }, "oruro", ZONAS)?.id).toBe("centro");
    expect(zonaMasCercana({ lat: -17.941, lng: -67.111 }, "oruro", ZONAS)?.id).toBe("norte");
  });

  it("no elige una zona de otra ciudad, aunque quede más cerca", () => {
    expect(zonaMasCercana({ lat: -16.4955, lng: -68.1336 }, "oruro", ZONAS)).toBeNull();
  });

  it("a más de 3 km no asigna: pregunta", () => {
    const lejos = { lat: -18.05, lng: -67.1064 };
    expect(distanciaKm(lejos, { lat: -17.9647, lng: -67.1064 })).toBeGreaterThan(3);
    expect(zonaMasCercana(lejos, "oruro", ZONAS)).toBeNull();
  });

  it("sin ciudad no hay zona", () => {
    expect(zonaMasCercana({ lat: -17.9647, lng: -67.1064 }, null, ZONAS)).toBeNull();
  });
});

describe("los rubros públicos", () => {
  it("cada uno apunta a una siembra que existe", () => {
    for (const rubro of RUBROS_PUBLICOS) {
      expect(RUBROS as readonly string[], rubro.id).toContain(siembraDeRubroPublico(rubro.id));
    }
  });

  it("no hay dos con el mismo identificador", () => {
    const ids = RUBROS_PUBLICOS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /* La lista vive en dos lugares: acá y en las dos restricciones de la base. Si
     se agrega uno acá y no allá, el panel lo ofrece y la base rechaza el
     guardado. */
  it("son los mismos que aceptan las dos restricciones de la base", () => {
    const sql = todasLasMigraciones();
    const principal = sql.match(/negocios_rubro_publico_valido check \(\s*rubro_publico is null or rubro_publico in \(([^)]+)\)/)?.[1] ?? "";
    const secundarios = sql.match(/rubros_secundarios <@ array\[([^\]]+)\]/)?.[1] ?? "";
    const ids = RUBROS_PUBLICOS.map(({ id }) => id);
    for (const lista of [principal, secundarios]) {
      expect([...lista.matchAll(/'([a-z_]+)'/g)].map(([, id]) => id)).toEqual(ids);
    }
  });

  it("los secundarios se limpian: sin el principal, sin repetidos, y con tope", () => {
    expect(leerRubrosSecundarios(["polleria", "polleria", "restaurante"], "restaurante")).toEqual({
      correcto: true,
      secundarios: ["polleria"],
    });
    expect(leerRubrosSecundarios(["inventado"], "restaurante").correcto).toBe(false);
    expect(
      leerRubrosSecundarios(["polleria", "cafeteria", "panaderia"], "restaurante").correcto,
    ).toBe(MAXIMO_RUBROS_SECUNDARIOS >= 3);
  });
});

describe("validarPresencia", () => {
  const SI = {
    rubro_publico: "jugueteria",
    rubros_secundarios: ["regalos"],
    aparece_en_directorio: true,
    ciudad: "oruro",
    ubicacion: { lat: -17.9647, lng: -67.1064 },
    zona_id: "00000000-0000-4000-8000-000000000001",
  };

  /* El pedido del dueño del proyecto: la decisión es obligatoria y nadie la toma
     por el negocio. */
  it("exige que se responda si quiere aparecer", () => {
    const sinRespuesta: Record<string, unknown> = { ...SI };
    delete sinRespuesta.aparece_en_directorio;
    const resultado = validarPresencia(sinRespuesta);
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores.aparece_en_directorio).toBeTruthy();
    expect(validarPresencia({ ...SI, aparece_en_directorio: "si" }).correcto).toBe(false);
  });

  it("con «sí» exige ciudad y un punto dentro de Bolivia", () => {
    expect(validarPresencia(SI).correcto).toBe(true);
    const sinCiudad = validarPresencia({ ...SI, ciudad: "" });
    expect(sinCiudad.correcto).toBe(false);
    const enMadrid = validarPresencia({ ...SI, ubicacion: { lat: 40.4, lng: -3.7 } });
    expect(enMadrid.correcto).toBe(false);
    if (!enMadrid.correcto) expect(enMadrid.errores.ubicacion).toBeTruthy();
  });

  it("con «no» no pide ubicación, y no borra la que había", () => {
    const resultado = validarPresencia({ rubro_publico: "jugueteria", aparece_en_directorio: false });
    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) {
      const cambios = cambiosDePresencia(resultado.presencia);
      expect(cambios).toEqual({
        rubro_publico: "jugueteria",
        rubros_secundarios: [],
        aparece_en_directorio: false,
      });
      expect("ubicacion_lat" in cambios).toBe(false);
    }
  });

  it("con una zona elegida, la propuesta se descarta", () => {
    const resultado = validarPresencia({ ...SI, zona_propuesta: "Mi barrio" });
    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) expect(cambiosDePresencia(resultado.presencia).zona_propuesta).toBeNull();
  });

  it("sin zona elegida, guarda la propuesta del dueño", () => {
    const resultado = validarPresencia({ ...SI, zona_id: null, zona_propuesta: "  Villa Challacollo " });
    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) {
      expect(cambiosDePresencia(resultado.presencia).zona_propuesta).toBe("Villa Challacollo");
    }
  });
});

/* **El punto exacto de un negocio nunca se publica.** En Bolivia es común vender
   desde la casa, y la coordenada de una casa en un catálogo público es la
   dirección de una persona.
 *
 * Esta guardia mira las dos puertas por donde podría salir: un `grant` a `anon`
 * en cualquier migración, y la lista de columnas que lee el catálogo público.
 * La prueba contra la base real está en `test:rls:multitenant`. */
describe("las coordenadas del negocio no llegan al público", () => {
  it("ninguna migración se las concede a anon", () => {
    const concesiones = [...todasLasMigraciones().matchAll(/grant\s+select\s*\(([^)]*)\)[^;]*to\s+([^;]+);/gi)];
    const aAnon = concesiones.filter(([, , roles]) => /\banon\b/.test(roles));
    for (const [sentencia, columnas] of aAnon) {
      expect(columnas, sentencia).not.toMatch(/ubicacion_(lat|lng)/);
    }
  });

  it("el catálogo público no las pide", () => {
    const fuente = readFileSync(join(RAIZ, "lib", "catalogo", "negocio-publico.ts"), "utf8");
    expect(fuente).not.toMatch(/ubicacion_(lat|lng)/);
  });

  it("el directorio público no las pide", () => {
    const fuente = readFileSync(join(RAIZ, "lib", "directorio.ts"), "utf8");
    expect(fuente).not.toMatch(/ubicacion_(lat|lng)/);
  });
});

describe("estaEnBolivia", () => {
  it("acepta las ciudades y rechaza lo que no es un número", () => {
    expect(estaEnBolivia({ lat: -17.9647, lng: -67.1064 })).toBe(true);
    expect(estaEnBolivia({ lat: Number.NaN, lng: -67 })).toBe(false);
  });
});
