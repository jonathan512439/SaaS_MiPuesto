import { readdirSync, readFileSync } from "node:fs";
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
    const [, topeCitas] = /const TOPE_INTENTOS_POR_VENTANA = (\d+);/.exec(citas) ?? [];

    /* El de los pedidos, en la última migración que define la función. */
    const carpeta = join(raiz, "supabase/migrations");
    const marca = "create or replace function public.crear_pedido_reservado(";
    const vigente = readdirSync(carpeta)
      .sort()
      .map((archivo) => readFileSync(join(carpeta, archivo), "utf8"))
      .filter((sql) => sql.includes(marca))
      .at(-1)!;
    const [, topePedidos] = /if v_limite > (\d+) then/.exec(vigente) ?? [];

    expect(Number(topeCitas)).toBeGreaterThan(0);
    expect(Number(topeCitas)).toBe(Number(topePedidos));
  });
});
