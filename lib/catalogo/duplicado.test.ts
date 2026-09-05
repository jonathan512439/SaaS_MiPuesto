import { describe, expect, it } from "vitest";

import { nombreDeCopia } from "./duplicado";
import { LARGO_MAXIMO_NOMBRE_PRODUCTO } from "./validacion";

describe("nombre de la copia", () => {
  it("marca la copia para poder distinguirla en la lista", () => {
    expect(nombreDeCopia("Polera roja")).toBe("Polera roja (copia)");
  });

  it("normaliza los espacios del original", () => {
    expect(nombreDeCopia("  Polera   roja  ")).toBe("Polera roja (copia)");
  });

  /* Se recorta el nombre y no el sufijo: sin sufijo, dos productos idénticos en
     la lista son indistinguibles. */
  it("recorta el nombre para que la copia entre en el límite", () => {
    const nombre = nombreDeCopia("a".repeat(LARGO_MAXIMO_NOMBRE_PRODUCTO + 40));
    expect(nombre.length).toBeLessThanOrEqual(LARGO_MAXIMO_NOMBRE_PRODUCTO);
    expect(nombre.endsWith(" (copia)")).toBe(true);
  });
});
