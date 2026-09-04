import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { proxy } from "./proxy";

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
