import { describe, expect, it } from "vitest";

import {
  DIAS_DE_GUARDA,
  ordenarPorUrgencia,
  resumirCliente,
  type NegocioPlataforma,
} from "./clientes";

const AHORA = new Date("2026-09-15T12:00:00-04:00");

function negocio(cambios: Partial<NegocioPlataforma> = {}): NegocioPlataforma {
  return {
    id: "n-1",
    slug: "negocio",
    nombre: "Negocio",
    activo: true,
    suspendido_en: null,
    suscripcion_vence_en: "2026-10-15T12:00:00-04:00",
    creado_en: "2026-01-01T00:00:00-04:00",
    ...cambios,
  };
}

describe("resumen del cliente", () => {
  it("distingue los cinco estados que piden acciones distintas", () => {
    expect(resumirCliente(negocio(), AHORA).estado).toBe("vigente");
    expect(
      resumirCliente(negocio({ suscripcion_vence_en: "2026-09-18T12:00:00-04:00" }), AHORA)
        .estado,
    ).toBe("por_vencer");
    /* Vencido pero todavía publicado: el corte corre una vez al día. */
    expect(
      resumirCliente(negocio({ suscripcion_vence_en: "2026-09-14T12:00:00-04:00" }), AHORA)
        .estado,
    ).toBe("vencida");
    expect(
      resumirCliente(
        negocio({ activo: false, suspendido_en: "2026-09-14T12:00:00-04:00" }),
        AHORA,
      ).estado,
    ).toBe("suspendido");
    /* Sin motivo de pago: lo bajó alguien a mano y no se toca. */
    expect(resumirCliente(negocio({ activo: false }), AHORA).estado).toBe("fuera_a_mano");
  });

  it("cuenta los días de guarda solo para el suspendido por pago", () => {
    const suspendido = resumirCliente(
      negocio({ activo: false, suspendido_en: "2026-09-05T12:00:00-04:00" }),
      AHORA,
    );
    expect(suspendido.diasDeGuardaRestantes).toBe(DIAS_DE_GUARDA - 10);
    expect(resumirCliente(negocio(), AHORA).diasDeGuardaRestantes).toBeNull();
  });
});

describe("orden por urgencia", () => {
  /* Ordena por lo que hay que atender primero, no por fecha. */
  it("pone primero a quien está por perder sus datos", () => {
    const clientes = [
      negocio({ id: "a", nombre: "Al día" }),
      negocio({ id: "b", nombre: "Vencido", suscripcion_vence_en: "2026-09-14T12:00:00-04:00" }),
      negocio({
        id: "c",
        nombre: "Suspendido",
        activo: false,
        suspendido_en: "2026-09-01T12:00:00-04:00",
      }),
      negocio({ id: "d", nombre: "Por vencer", suscripcion_vence_en: "2026-09-18T12:00:00-04:00" }),
    ].map((n) => resumirCliente(n, AHORA));

    expect(ordenarPorUrgencia(clientes).map(({ negocio: n }) => n.id)).toEqual([
      "c",
      "b",
      "d",
      "a",
    ]);
  });

  it("desempata por nombre para que la lista no baile entre recargas", () => {
    const clientes = [
      negocio({ id: "z", nombre: "Zeta" }),
      negocio({ id: "a", nombre: "Alfa" }),
    ].map((n) => resumirCliente(n, AHORA));
    expect(ordenarPorUrgencia(clientes).map(({ negocio: n }) => n.nombre)).toEqual([
      "Alfa",
      "Zeta",
    ]);
  });
});
