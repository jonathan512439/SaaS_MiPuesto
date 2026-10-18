import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/* Solo cuatro respuestas se guardan en la caché pública.
 *
 * La caché de Workers está encendida (`wrangler.jsonc`) y guarda toda respuesta
 * que diga `Cache-Control: public`: la siguiente persona recibe la copia sin
 * que el Worker la vuelva a armar. Revisado el 2026-10-13 en producción: las
 * páginas salen con `no-store` y no se guardan, y solo estas tres rutas lo
 * piden, a propósito y con datos que no son de nadie en particular:
 *
 * - `/api/salud`, quince segundos, para que un vigilante que la martille no
 *   llegue a la base;
 * - las sugerencias del directorio, treinta segundos: lo que se busca, no
 *   quién busca;
 * - el manifiesto de cada catálogo, cinco minutos: nombre y colores;
 * - los archivos de los tutoriales (`lib/tutoriales/archivos.ts`, desde el
 *   2026-10-18), para siempre: el video y la portada son de la plataforma, sin
 *   datos de nadie, y un nombre nunca se reutiliza. Solo el archivo entero:
 *   las partes que pide el reproductor salen con `no-store`.
 *
 * El riesgo es el próximo: una ruta del panel, o una con el pedido de un
 * cliente, marcada `public` por copiar una cabecera. La caché se la serviría a
 * otra persona. Una ruta nueva que quiera caché pública se agrega acá, con su
 * motivo, después de comprobar que no lleva datos de un dueño ni de un
 * cliente. */
const CON_CACHE_PUBLICA = new Set([
  "app/api/salud/route.ts",
  "app/api/directorio/sugerencias/route.ts",
  "app/(public)/[slug]/manifest.webmanifest/route.ts",
  "lib/tutoriales/archivos.ts",
]);
const RAIZ = join(import.meta.dirname, "..");

function archivosTs(directorio: string): string[] {
  return readdirSync(directorio).flatMap((nombre) => {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) return archivosTs(ruta);
    return /\.tsx?$/.test(nombre) && !nombre.includes(".test.") ? [ruta] : [];
  });
}

/* `public` o `s-maxage` dentro de un texto: las dos formas de pedirle a la
   caché compartida que guarde la respuesta. */
function pideCachePublica(codigo: string): boolean {
  return /["'`][^"'`\n]*\b(public\b[^"'`\n]*max-age|s-maxage)/i.test(codigo);
}

describe("caché pública", () => {
  it("reconoce las formas de pedirla y no confunde las que no la piden", () => {
    expect(pideCachePublica(`"Cache-Control": "public, max-age=30"`)).toBe(true);
    expect(pideCachePublica("`public, max-age=${segundos}`")).toBe(true);
    expect(pideCachePublica(`'max-age=0, s-maxage=60'`)).toBe(true);
    expect(pideCachePublica(`"Cache-Control": "no-store"`)).toBe(false);
    expect(pideCachePublica(`"private, max-age=60"`)).toBe(false);
    expect(pideCachePublica(`cacheControl: "31536000"`)).toBe(false);
  });

  it("solo la piden las cuatro respuestas sin datos de nadie", () => {
    const conCache = ["app", "lib"]
      .flatMap((carpeta) => archivosTs(join(RAIZ, carpeta)))
      .filter((archivo) => pideCachePublica(readFileSync(archivo, "utf8")))
      .map((archivo) => relative(RAIZ, archivo).replaceAll("\\", "/"));
    expect(conCache.filter((ruta) => !CON_CACHE_PUBLICA.has(ruta))).toEqual([]);
    // Si una de las cuatro deja de pedirla, se quita de la lista.
    expect([...CON_CACHE_PUBLICA].filter((ruta) => !conCache.includes(ruta))).toEqual([]);
  });
});
