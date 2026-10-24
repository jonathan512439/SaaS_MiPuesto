import { describe, expect, it } from "vitest";

import { DIRECCION_ANTERIOR, destinoCanonico } from "./dominio-canonico";

const SITIO = "https://mi-puesto.com";

describe("la dirección única del sitio", () => {
  it("manda la dirección de workers.dev a mi-puesto.com, con su ruta y sus parámetros", () => {
    const destino = destinoCanonico(new URL(`https://${DIRECCION_ANTERIOR}/kantuta-moda?categoria=calzado`), SITIO);
    expect(destino?.toString()).toBe("https://mi-puesto.com/kantuta-moda?categoria=calzado");
  });

  it("manda www a la dirección sin www", () => {
    expect(destinoCanonico(new URL("https://www.mi-puesto.com/directorio"), SITIO)?.toString()).toBe(
      "https://mi-puesto.com/directorio",
    );
  });

  it("no toca lo que ya llega por mi-puesto.com", () => {
    expect(destinoCanonico(new URL("https://mi-puesto.com/kantuta-moda"), SITIO)).toBeNull();
  });

  /* Las versiones de prueba de Workers Builds tienen otro nombre: redirigirlas
     haría imposible revisar un cambio antes de publicarlo. */
  it("no toca las direcciones de prueba de cada versión", () => {
    expect(destinoCanonico(new URL("https://a1b2c3d4-mipuesto-dev.mipuesto-app.workers.dev/"), SITIO)).toBeNull();
    expect(destinoCanonico(new URL("http://localhost:3000/"), SITIO)).toBeNull();
  });

  /* El cambio de dominio se hace con la variable del sitio. Antes de cambiarla,
     redirigir mandaría a la gente a un dominio que todavía no responde. */
  it("no redirige nada mientras el sitio siga siendo workers.dev", () => {
    expect(destinoCanonico(new URL(`https://${DIRECCION_ANTERIOR}/`), `https://${DIRECCION_ANTERIOR}`)).toBeNull();
    expect(destinoCanonico(new URL("https://www.mi-puesto.com/"), `https://${DIRECCION_ANTERIOR}`)).toBeNull();
  });
});
