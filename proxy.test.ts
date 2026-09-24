import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { proxy, requiereGestionDeSesion } from "./proxy";

describe("proxy HTTPS", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirige una URL pública HTTP a HTTPS conservando ruta y consulta", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const respuesta = await proxy(
      new NextRequest("http://mipuesto.example/tienda?pagina=2"),
    );

    expect(respuesta.status).toBe(308);
    expect(respuesta.headers.get("location")).toBe(
      "https://mipuesto.example/tienda?pagina=2",
    );
  });

  it("no rompe el servidor HTTP local usado en las comprobaciones", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const respuesta = await proxy(new NextRequest("http://localhost:3000/directorio"));

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("x-middleware-next")).toBe("1");
  });

  it("deja continuar una URL pública que ya usa HTTPS", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const respuesta = await proxy(new NextRequest("https://mipuesto.example/directorio"));

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("qué rutas renuevan la sesión", () => {
  /* `/plataforma` era la única ruta sensible que quedaba fuera: al administrador
     lo echaba al ingreso en medio del trabajo. */
  it("cubre la plataforma además del panel", () => {
    expect(requiereGestionDeSesion("/plataforma")).toBe(true);
    expect(requiereGestionDeSesion("/dashboard/catalogo")).toBe(true);
    expect(requiereGestionDeSesion("/login")).toBe(true);
  });

  it("no toca las páginas públicas", () => {
    expect(requiereGestionDeSesion("/directorio")).toBe(false);
    expect(requiereGestionDeSesion("/sabor-camba")).toBe(false);
    expect(requiereGestionDeSesion("/t/BCD234")).toBe(false);
  });
});

/* La política de contenido lleva un nonce por solicitud. Tiene que llegar a
   los dos lados: a la página —vinext y React lo leen de la solicitud— y al
   navegador, que es quien la hace cumplir. Si falta en la solicitud, los
   scripts de React salen sin nonce y el navegador los bloquea: el catálogo se
   ve pero no responde. */
describe("proxy y política de contenido", () => {
  function nonceDe(politica: string | null) {
    return /'nonce-([^']+)'/.exec(politica ?? "")?.[1];
  }

  it("pone la misma política con nonce en la respuesta y en la solicitud", async () => {
    const respuesta = await proxy(new NextRequest("http://localhost:3000/brasaurbana"));
    const enLaRespuesta = respuesta.headers.get("content-security-policy");
    const nonce = nonceDe(enLaRespuesta);

    expect(nonce).toBeTruthy();
    expect(respuesta.headers.get("x-middleware-request-content-security-policy")).toBe(
      enLaRespuesta,
    );
    expect(respuesta.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
  });

  it("un nonce distinto en cada solicitud", async () => {
    const [una, otra] = await Promise.all([
      proxy(new NextRequest("http://localhost:3000/brasaurbana")),
      proxy(new NextRequest("http://localhost:3000/brasaurbana")),
    ]);
    expect(nonceDe(una.headers.get("content-security-policy"))).not.toBe(
      nonceDe(otra.headers.get("content-security-policy")),
    );
  });
});
