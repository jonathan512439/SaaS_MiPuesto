import { describe, expect, it } from "vitest";

import { crearNonce, politicaDeContenido } from "./politica-contenido";

function directiva(politica: string, nombre: string) {
  return politica.split("; ").find((parte) => parte.startsWith(`${nombre} `)) ?? "";
}

describe("la política de contenido", () => {
  it("el nonce es aleatorio, de 128 bits y seguro dentro de una cabecera", () => {
    const nonces = new Set(Array.from({ length: 50 }, () => crearNonce()));
    expect(nonces.size).toBe(50);
    for (const nonce of nonces) expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });

  it("los scripts piden el nonce; los estilos no, porque React los escribe en línea", () => {
    const politica = politicaDeContenido("abc123", false);
    expect(directiva(politica, "script-src")).toContain("'nonce-abc123'");
    expect(directiva(politica, "style-src")).not.toContain("nonce");
    expect(directiva(politica, "style-src")).toContain("'unsafe-inline'");
  });

  it("'unsafe-eval' solo en desarrollo, y Turnstile siempre", () => {
    expect(politicaDeContenido("n", false)).not.toContain("unsafe-eval");
    expect(politicaDeContenido("n", true)).toContain("'unsafe-eval'");
    expect(directiva(politicaDeContenido("n", false), "script-src")).toContain(
      "https://challenges.cloudflare.com",
    );
    expect(directiva(politicaDeContenido("n", false), "frame-src")).toContain(
      "https://challenges.cloudflare.com",
    );
  });

  it("conserva las defensas que no dependen del nonce", () => {
    const politica = politicaDeContenido("n", false);
    for (const regla of ["object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'"]) {
      expect(politica).toContain(regla);
    }
  });
});
