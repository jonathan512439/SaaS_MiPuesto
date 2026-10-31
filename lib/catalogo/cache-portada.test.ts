import { describe, expect, it } from "vitest";

import { CACHE_PORTADA, conCacheDePortada, esPortadaDeCatalogo } from "./cache-portada";

const pedir = (ruta: string, metodo = "GET") => new Request(`https://mi-puesto.com${ruta}`, { method: metodo });
const html = (cabeceras: Record<string, string> = {}, estado = 200) =>
  new Response("<html></html>", {
    status: estado,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", ...cabeceras },
  });

describe("la portada del catálogo en la caché", () => {
  it("guarda solo la portada de un catálogo, sin nada en la dirección", () => {
    expect(esPortadaDeCatalogo(pedir("/kallpa-zapatillas"))).toBe(true);
    expect(esPortadaDeCatalogo(pedir("/brasaurbana"))).toBe(true);

    expect(esPortadaDeCatalogo(pedir("/kallpa-zapatillas?categoria=x"))).toBe(false);
    expect(esPortadaDeCatalogo(pedir("/kallpa-zapatillas?_rsc=abc"))).toBe(false);
    expect(esPortadaDeCatalogo(pedir("/kallpa-zapatillas/"))).toBe(false);
    expect(esPortadaDeCatalogo(pedir("/kallpa-zapatillas/p/PRD-1234ABCD"))).toBe(false);
    expect(esPortadaDeCatalogo(pedir("/kallpa-zapatillas", "POST"))).toBe(false);
    expect(esPortadaDeCatalogo(pedir("/"))).toBe(false);
  });

  it("nunca alcanza al panel ni a otra ruta del sistema", () => {
    for (const ruta of ["/dashboard", "/alta", "/plataforma", "/login", "/api", "/directorio", "/empezar"]) {
      expect(esPortadaDeCatalogo(pedir(ruta)), ruta).toBe(false);
    }
  });

  it("le pone la cabecera a la portada que salió bien", () => {
    const respuesta = conCacheDePortada(pedir("/kallpa-zapatillas"), html());
    expect(respuesta.headers.get("cache-control")).toBe(CACHE_PORTADA);
    expect(respuesta.headers.get("content-type")).toContain("text/html");
  });

  it("deja tal cual un error, otra cosa que no sea HTML o lo que trae cookies", () => {
    const solicitud = pedir("/kallpa-zapatillas");
    for (const respuesta of [
      html({}, 503),
      html({}, 404),
      html({ "set-cookie": "sb=1" }),
      new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
    ]) {
      expect(conCacheDePortada(solicitud, respuesta).headers.get("cache-control")).not.toBe(CACHE_PORTADA);
    }
  });

  it("no toca la respuesta del panel aunque salga bien", () => {
    const respuesta = html();
    expect(conCacheDePortada(pedir("/dashboard"), respuesta)).toBe(respuesta);
  });
});
