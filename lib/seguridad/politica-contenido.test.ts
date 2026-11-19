import { describe, expect, it } from "vitest";

import { crearNonce, origenesDeSupabase, politicaDeContenido } from "./politica-contenido";

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

  /* Hasta el 2026-11-15 `connect-src` admitía cualquier `*.supabase.co`: un
     script que lograra correr en la página podía mandar lo que leyera —la sesión
     del dueño, los pedidos— a un proyecto de Supabase de quien fuera, que cuesta
     cero abrir. Ahora solo se habla con el proyecto del sitio. */
  it("solo deja conectar con el proyecto de Supabase del sitio", () => {
    const conexion = directiva(
      politicaDeContenido("n", false, "https://afhnxjdqaruwccgsdxzb.supabase.co"),
      "connect-src",
    );
    expect(conexion).toBe(
      "connect-src 'self' https://afhnxjdqaruwccgsdxzb.supabase.co wss://afhnxjdqaruwccgsdxzb.supabase.co",
    );
    expect(conexion).not.toContain("*");
  });

  it("en desarrollo, con la base local, deja conectar con ella y con nada más", () => {
    expect(origenesDeSupabase("http://127.0.0.1:54321/")).toBe("http://127.0.0.1:54321 ws://127.0.0.1:54321");
  });

  /* Sin la variable, o con algo que no es una dirección, la política vuelve a
     ser la de antes: un sitio que no puede hablar con su base es peor que uno
     con la política ancha, y la variable que falta ya se nota por otro lado. */
  it("sin la dirección del proyecto no deja el sitio sin base", () => {
    for (const valor of [undefined, "", "no es una dirección", "ftp://x.supabase.co"]) {
      expect(origenesDeSupabase(valor)).toBe("https://*.supabase.co wss://*.supabase.co");
    }
  });

  it("no se deja torcer por lo que venga pegado a la dirección", () => {
    /* Solo se usa el origen: lo que siga a la dirección no llega a la cabecera. */
    expect(origenesDeSupabase("https://abc.supabase.co/rest/v1; script-src *")).toBe(
      "https://abc.supabase.co wss://abc.supabase.co",
    );
    expect(origenesDeSupabase("https://abc.supabase.co/rest/v1/")).toBe(
      "https://abc.supabase.co wss://abc.supabase.co",
    );
  });
});
