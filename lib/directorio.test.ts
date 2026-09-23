import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  direccionDeBusqueda,
  leerFiltrosDirectorio,
  palabrasDeBusqueda,
  rubrosQueCoinciden,
} from "./directorio";
import { redondearCerca } from "./directorio-cerca";
import { leerSinonimo } from "./directorio-sinonimos";

describe("palabrasDeBusqueda", () => {
  it("quita tildes, signos y mayúsculas, y no repite", () => {
    expect(palabrasDeBusqueda("¡Muñecas, MUÑECAS y Café!")).toEqual(["munecas", "cafe"]);
  });

  it("no pasa de seis palabras y descarta las de una letra", () => {
    expect(palabrasDeBusqueda("a b uno dos tres cuatro cinco seis siete")).toEqual([
      "uno",
      "dos",
      "tres",
      "cuatro",
      "cinco",
      "seis",
    ]);
  });

  it("con nada escrito no busca nada", () => {
    expect(palabrasDeBusqueda("   ")).toEqual([]);
  });
});

/* Un negocio aparece por lo que es, aunque ninguno de sus productos diga la
   palabra: quien busca «restaurantes» tiene que encontrar a los restaurantes. */
describe("rubrosQueCoinciden", () => {
  it("el plural encuentra el rubro", () => {
    expect(rubrosQueCoinciden(["restaurantes"])).toContain("restaurante");
    expect(rubrosQueCoinciden(["juguetes"])).toContain("jugueteria");
    expect(rubrosQueCoinciden(["veterinarias"])).toContain("veterinaria");
  });

  it("una palabra corta o que no es rubro no encuentra nada", () => {
    expect(rubrosQueCoinciden(["xy"])).toEqual([]);
    expect(rubrosQueCoinciden(["hamburguesa"])).toEqual([]);
  });
});

describe("leerFiltrosDirectorio", () => {
  it("ignora lo que no entiende, en vez de romper la página", () => {
    const filtros = leerFiltrosDirectorio({
      ciudad: "narnia",
      zona: "no-es-un-id",
      rubro: "inventado",
      pagina: "-3",
      cerca: "40.4,-3.7",
    });
    expect(filtros).toMatchObject({ ciudad: null, zonaId: null, rubro: null, pagina: 1, cerca: null });
  });

  it("lee una búsqueda válida, y la ciudad y el rubro fijos de la página ganan", () => {
    const filtros = leerFiltrosDirectorio(
      { q: " juguetes ", ciudad: "la_paz", cerca: "-17.96473,-67.10641" },
      { ciudad: "oruro" },
    );
    expect(filtros.texto).toBe("juguetes");
    expect(filtros.ciudad).toBe("oruro");
    /* Redondeado a dos decimales: no dice dónde vive nadie. */
    expect(filtros.cerca).toEqual({ lat: -17.96, lng: -67.11 });
  });

  it("recorta la búsqueda a su techo", () => {
    expect(leerFiltrosDirectorio({ q: "x".repeat(200) }).texto).toHaveLength(60);
  });
});

describe("redondearCerca", () => {
  it("deja dos decimales, alrededor de un kilómetro", () => {
    expect(redondearCerca(-17.964712, -67.106398)).toEqual({ lat: -17.96, lng: -67.11 });
  });
});

describe("direccionDeBusqueda", () => {
  it("arma la dirección con lo que hay, y sin la página 1", () => {
    expect(direccionDeBusqueda({ texto: "juguetes", ciudad: "oruro", pagina: 1 })).toBe(
      "/directorio?q=juguetes&ciudad=oruro",
    );
    expect(direccionDeBusqueda({})).toBe("/directorio");
  });
});

/* Los sinónimos se guardan como llega una búsqueda: sin tildes ni mayúsculas.
   Guardados como los escribe el administrador, no coincidirían nunca. */
describe("leerSinonimo", () => {
  it("normaliza la palabra y sus equivalentes", () => {
    expect(leerSinonimo("Juguetes", "Muñeca, PELUCHE, peluche, juguetes")).toEqual({
      correcto: true,
      termino: "juguetes",
      equivalentes: ["muneca", "peluche"],
    });
  });

  it("exige al menos un equivalente", () => {
    expect(leerSinonimo("juguetes", "").correcto).toBe(false);
  });
});

/* **El buscador nunca devuelve coordenadas.** La función de la base es la única
   puerta, y lo que devuelve lo dice su `returns table`. Si alguna migración le
   suma una columna de ubicación, esto falla antes de que llegue a producción.
   La prueba contra la base real está en `test:rls:multitenant`. */
describe("la búsqueda no devuelve coordenadas", () => {
  it("ninguna versión de la función las tiene entre lo que devuelve", () => {
    const carpeta = join(import.meta.dirname, "..", "supabase", "migrations");
    /* Todas las migraciones que la definen, no una lista escrita a mano: la
       próxima que la cambie tiene que pasar por acá sin que nadie se acuerde. */
    const archivos = readdirSync(carpeta).filter((archivo) =>
      readFileSync(join(carpeta, archivo), "utf8").includes("function public.buscar_en_directorio("),
    );
    expect(archivos.length).toBeGreaterThan(0);
    for (const archivo of archivos) {
      const sql = readFileSync(join(carpeta, archivo), "utf8");
      const devuelve = sql.match(/function public\.buscar_en_directorio\([\s\S]*?returns table \(([\s\S]*?)\)\s*language/)?.[1] ?? "";
      expect(devuelve, archivo).not.toBe("");
      expect(devuelve, archivo).not.toMatch(/ubicacion|latitud|longitud|\blat\b|\blng\b/);
    }
  });
});
