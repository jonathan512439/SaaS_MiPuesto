import { describe, expect, it } from "vitest";

import {
  CARGA_INICIAL,
  PLANES,
  PLAN_ANUAL,
  TARJETA_ACRILICO,
  TARJETA_ACRILICO_GRANDE,
  TOPE_TECNICO_MENSUAL,
  ahorroAnualBs,
  precioAnualSuelto,
} from "./planes";
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

  it("las dos tarjetas de acrílico tienen precio y medidas", () => {
    for (const tarjeta of [TARJETA_ACRILICO, TARJETA_ACRILICO_GRANDE]) {
      expect(tarjeta.precioBs).toBeGreaterThan(0);
      expect(tarjeta.medidas).toMatch(/cm$/);
    }
  });

  /* El dibujo de la portada usa una sola proporción para las dos: si alguien
     cambia una medida y deja de ser cinco por siete, el dibujo miente. */
  it("las dos tarjetas son de cinco por siete, y la grande es más grande", () => {
    const medidas = (texto: string) =>
      texto.replace(" cm", "").split(" × ").map((lado) => Number(lado.replace(",", ".")));
    const [anchoMesa, altoMesa] = medidas(TARJETA_ACRILICO.medidas);
    const [anchoGrande, altoGrande] = medidas(TARJETA_ACRILICO_GRANDE.medidas);
    expect(anchoMesa / altoMesa).toBeCloseTo(5 / 7);
    expect(anchoGrande / altoGrande).toBeCloseTo(5 / 7);
    expect(anchoGrande).toBeGreaterThan(anchoMesa);
    expect(TARJETA_ACRILICO_GRANDE.precioBs).toBeGreaterThan(TARJETA_ACRILICO.precioBs);
  });

  it("la carga inicial tiene precio y alcance", () => {
    expect(CARGA_INICIAL.precioBs).toBeGreaterThan(0);
    expect(CARGA_INICIAL.productosMaximos).toBeGreaterThan(0);
  });
});

describe("el pago por año", () => {
  /* Un anual más caro que doce meses sueltos es un error de tipeo que nadie
     mira dos veces, y sale publicado en la portada hablando de plata. */
  it("cuesta menos que pagar los doce meses", () => {
    expect(PLAN_ANUAL.precioBs).toBeLessThan(precioAnualSuelto());
    expect(ahorroAnualBs()).toBeGreaterThan(0);
  });

  /* El ahorro se calcula y no se escribe. Si el mensual sube y la frase de la
     portada quedó escrita a mano, la portada miente. */
  it("el ahorro sale de los precios y no de un número escrito", () => {
    expect(ahorroAnualBs()).toBe(precioAnualSuelto() - PLAN_ANUAL.precioBs);
  });

  it("apunta a un plan que existe", () => {
    expect(PLANES.some(({ id }) => id === PLAN_ANUAL.planId)).toBe(true);
  });
});
