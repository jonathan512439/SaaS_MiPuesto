import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { esLaMismaReserva, respuestaDeCita } from "./respuesta-de-cita";

/* El texto del mensaje dentro del enlace: los espacios viajan como «+». */
const textoDelEnlace = (enlace: string | null) => decodeURIComponent((enlace ?? "").replaceAll("+", " "));

/* La respuesta de una reserva sale siempre de la cita guardada.
 *
 * La primera reserva devolvía el enlace de WhatsApp, pero el reintento —el
 * navegador que repite después de un corte— devolvía solo el código: el turno
 * quedaba apartado sin abrir la conversación con el negocio. Y en la rama del
 * choque se devolvía la hora pedida en vez de la guardada. Lo encontró la
 * auditoría del 2026-09-30. */

const NEGOCIO = { nombre: "Huellitas Veterinaria", telefono_whatsapp: "61832872" };
const PRODUCTO = { nombre: "Vacuna antirrábica", precio: 50 };
const GUARDADA = {
  codigo: "CIT-12345678",
  inicio: "2026-09-28T14:10:00+00:00",
  nombre_cliente: "Ana Torres",
  nota: "Es un cachorro",
};

describe("respuestaDeCita", () => {
  it("trae el código, la hora guardada y el enlace con el mensaje completo", () => {
    const respuesta = respuestaDeCita(GUARDADA, PRODUCTO, NEGOCIO);
    expect(respuesta.cita).toEqual({
      codigo: "CIT-12345678",
      inicio: "2026-09-28T14:10:00+00:00",
      cuando: expect.stringContaining("10:10"),
    });
    const mensaje = textoDelEnlace(respuesta.enlaceWhatsapp);
    for (const parte of ["Vacuna antirrábica", "Huellitas Veterinaria", "CIT-12345678", "Ana Torres", "Es un cachorro", "10:10"]) {
      expect(mensaje).toContain(parte);
    }
  });

  it("sin nota, el mensaje no la menciona", () => {
    const mensaje = textoDelEnlace(respuestaDeCita({ ...GUARDADA, nota: null }, PRODUCTO, NEGOCIO).enlaceWhatsapp);
    expect(mensaje).not.toContain("Nota:");
  });
});

describe("esLaMismaReserva", () => {
  it("reconoce la misma reserva aunque la hora venga escrita de otra forma", () => {
    expect(
      esLaMismaReserva(
        { producto_id: "p1", inicio: "2026-09-28T14:10:00+00:00" },
        { productoId: "p1", inicio: "2026-09-28T10:10:00-04:00" },
      ),
    ).toBe(true);
  });

  it("un intento repetido para otro servicio u otra hora no es la misma reserva", () => {
    const guardada = { producto_id: "p1", inicio: "2026-09-28T14:10:00+00:00" };
    expect(esLaMismaReserva(guardada, { productoId: "p2", inicio: guardada.inicio })).toBe(false);
    expect(esLaMismaReserva(guardada, { productoId: "p1", inicio: "2026-09-28T14:30:00+00:00" })).toBe(false);
  });
});

describe("la ruta de reservas", () => {
  const ruta = readFileSync(join(import.meta.dirname, "..", "..", "app/api/publico/[slug]/citas/route.ts"), "utf8");
  it("arma las tres respuestas —nueva, reintento y choque— desde la cita guardada", () => {
    // La nueva la arma directo; el reintento y el choque, con la misma ayuda.
    expect(ruta.match(/respuestaDeCita\(/g)?.length).toBeGreaterThanOrEqual(2);
    expect(ruta.match(/return responderCitaGuardada\(/g)?.length).toBe(2);
    expect(ruta).toMatch(/esLaMismaReserva\(/);
    expect(ruta).not.toMatch(/inicio: rango\.inicio,\s*cuando: describirCita\(rango\.inicio\)/);
  });
});
