import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { crearClienteSupabaseAdmin } from "./admin";

afterEach(() => {
  vi.unstubAllEnvs();
});

/* El cliente privilegiado se reusa dentro del isolate para no pagar su armado
   en cada pedido. Tiene que seguir la dirección y la clave del entorno: una
   clave rotada no puede quedar escondida detrás de un cliente viejo. */
describe("el cliente con la clave de servicio", () => {
  function entorno(url: string, clave: string) {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "clave-publica");
    vi.stubEnv("SUPABASE_SECRET_KEY", clave);
  }

  it("se reusa mientras el entorno no cambia", () => {
    entorno("https://uno.supabase.co", "clave-uno");
    expect(crearClienteSupabaseAdmin()).toBe(crearClienteSupabaseAdmin());
  });

  it("se arma de nuevo si cambia la clave o la dirección", () => {
    entorno("https://uno.supabase.co", "clave-uno");
    const primero = crearClienteSupabaseAdmin();
    entorno("https://uno.supabase.co", "clave-rotada");
    const conOtraClave = crearClienteSupabaseAdmin();
    expect(conOtraClave).not.toBe(primero);
    entorno("https://dos.supabase.co", "clave-rotada");
    expect(crearClienteSupabaseAdmin()).not.toBe(conOtraClave);
  });

  it("sin clave falla, aunque antes hubiera un cliente guardado", () => {
    entorno("https://uno.supabase.co", "clave-uno");
    crearClienteSupabaseAdmin();
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => crearClienteSupabaseAdmin()).toThrow(/clave privada/);
  });
});
