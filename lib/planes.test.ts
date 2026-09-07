import { describe, expect, it } from "vitest";

import { CARGA_INICIAL, PLANES, TOPE_TECNICO_MENSUAL } from "./planes";
import { PRECIO_MENSUAL_BS } from "./contacto";

/* Lo que la portada promete tiene que caber en lo que el sistema autoriza. Si un
   plan ofreciera más lecturas que el tope técnico, el cliente pagaría por un
   cupo que la base le va a negar, y el reclamo llegaría por WhatsApp. */
describe("planes", () => {
  it("ningún plan promete más lecturas de las que el sistema permite", () => {
    for (const plan of PLANES) {
      expect(plan.lecturasPorMes, `${plan.nombre} promete de más`).toBeLessThanOrEqual(
        TOPE_TECNICO_MENSUAL,
      );
    }
  });

  it("el plan base cuesta lo que dice el resto del sitio", () => {
    const base = PLANES.find(({ id }) => id === "catalogo");
    expect(base?.precioBs).toBe(PRECIO_MENSUAL_BS);
  });

  /* Un plan más caro que ofrece lo mismo o menos es un error de tipeo que nadie
     nota hasta que un cliente lo señala. */
  it("pagar más da más", () => {
    const ordenados = [...PLANES].sort((a, b) => a.precioBs - b.precioBs);
    for (let i = 1; i < ordenados.length; i += 1) {
      expect(ordenados[i].lecturasPorMes).toBeGreaterThan(ordenados[i - 1].lecturasPorMes);
    }
  });

  it("solo un plan está destacado", () => {
    expect(PLANES.filter(({ destacado }) => destacado)).toHaveLength(1);
  });

  it("la carga inicial tiene precio y alcance", () => {
    expect(CARGA_INICIAL.precioBs).toBeGreaterThan(0);
    expect(CARGA_INICIAL.productosMaximos).toBeGreaterThan(0);
  });
});
