import { afterEach, describe, expect, it, vi } from "vitest";

import { crearHuellaIp, leerSecretoHuella } from "./huella-ip";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("el secreto de la huella de IP", () => {
  it("es el propio, no la clave de servicio de Supabase", () => {
    vi.stubEnv("HUELLA_IP_SECRETO", "a".repeat(64));
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "clave-de-servicio-que-no-se-usa-para-esto-000000");
    expect(leerSecretoHuella()).toBe("a".repeat(64));
  });

  it("sin el propio no firma con la clave de servicio: falla", () => {
    vi.stubEnv("HUELLA_IP_SECRETO", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "clave-de-servicio-que-no-se-usa-para-esto-000000");
    vi.stubEnv("SUPABASE_SECRET_KEY", "otra-clave-que-tampoco-se-usa-para-esto-0000000");
    expect(() => leerSecretoHuella()).toThrow(/HUELLA_IP_SECRETO/);
  });

  it("uno corto tampoco sirve: con pocos caracteres la firma se adivina", () => {
    vi.stubEnv("HUELLA_IP_SECRETO", "corto");
    expect(() => leerSecretoHuella()).toThrow();
  });
});

describe("la firma de la IP", () => {
  it("la misma IP con el mismo secreto da la misma firma, y la IP no aparece", async () => {
    const una = await crearHuellaIp("200.87.1.2", "s".repeat(64));
    expect(await crearHuellaIp("200.87.1.2", "s".repeat(64))).toBe(una);
    expect(una).toMatch(/^[0-9a-f]{64}$/);
    expect(una).not.toContain("200.87");
  });

  it("otro secreto da otra firma: rotarlo reinicia los topes, nada más", async () => {
    expect(await crearHuellaIp("200.87.1.2", "s".repeat(64))).not.toBe(
      await crearHuellaIp("200.87.1.2", "t".repeat(64)),
    );
  });
});

/* La clave importada se guarda entre pedidos para ahorrar CPU. Lo que no puede
   pasar es que, al cambiar el secreto, se siga firmando con la clave vieja: la
   firma tiene que ser siempre la de una importación hecha en el momento. */
describe("la clave guardada entre pedidos", () => {
  async function firmaDeReferencia(ip: string, secreto: string) {
    const codificar = new TextEncoder();
    const clave = await crypto.subtle.importKey(
      "raw",
      codificar.encode(secreto),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const firma = await crypto.subtle.sign("HMAC", clave, codificar.encode(ip));
    return Array.from(new Uint8Array(firma), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  it("firma con el secreto de cada llamada, aunque se alternen", async () => {
    for (const secreto of ["s".repeat(64), "t".repeat(64), "s".repeat(64), "u".repeat(40)]) {
      expect(await crearHuellaIp("190.129.4.8", secreto)).toBe(
        await firmaDeReferencia("190.129.4.8", secreto),
      );
    }
  });
});
