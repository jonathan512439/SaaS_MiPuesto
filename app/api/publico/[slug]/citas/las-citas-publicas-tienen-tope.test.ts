import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/* Toda ruta pública que escribe cuenta por huella de IP.
 *
 * Los pedidos y la analítica lo hacían desde que existen; las citas nacieron
 * después y nadie les puso el tope. La auditoría previa al MVP lo encontró: un
 * script con idempotencias distintas llenaba la agenda de un negocio en un
 * minuto. Esta prueba mira el texto de las tres rutas y exige que cada una
 * calcule la huella y la use, para que la próxima ruta pública que se escriba
 * no vuelva a nacer sin tope. */
const RUTAS_PUBLICAS_QUE_ESCRIBEN = [
  "app/api/pedidos/route.ts",
  "app/api/analitica/route.ts",
  "app/api/publico/[slug]/citas/route.ts",
];

describe("las rutas públicas que escriben cuentan por huella de IP", () => {
  const raiz = join(import.meta.dirname, "../../../../..");

  for (const ruta of RUTAS_PUBLICAS_QUE_ESCRIBEN) {
    it(`${ruta} calcula la huella y la manda a la base`, () => {
      const fuente = readFileSync(join(raiz, ruta), "utf8");
      expect(fuente).toContain("crearHuellaIp(obtenerIpSolicitud(solicitud)");
      expect(fuente).toContain("p_huella_ip");
    });
  }

  it("las citas devuelven 429 con el mismo tope que los pedidos", () => {
    const citas = readFileSync(join(raiz, RUTAS_PUBLICAS_QUE_ESCRIBEN[2]), "utf8");
    expect(citas).toContain("status: 429");
    expect(citas).toContain("const TOPE_INTENTOS_POR_VENTANA = 5;");
    const pedidos = readFileSync(
      join(raiz, "supabase/migrations/20260903021631_fase6_pedidos_reservas.sql"),
      "utf8",
    );
    expect(pedidos).toContain("if v_limite > 5 then");
  });
});
