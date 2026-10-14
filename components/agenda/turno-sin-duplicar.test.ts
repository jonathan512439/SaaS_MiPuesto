import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/* Un turno cargado a mano no se duplica ni choca consigo mismo al reintentar.
 *
 * El 2026-09-26, cargando turnos a mano, Cloudflare respondió 503 en tres de
 * once, y uno se había guardado igual: el dueño veía el error, volvía a tocar
 * «Guardar» y el reintento chocaba con su propio turno —«Ese horario ya está
 * ocupado»— o, al pausar las reservas, dejaba la mitad de los bloqueos hechos.
 *
 * Ahora el panel manda una clave por intento y la reusa mientras se reintente
 * lo mismo, y la ruta devuelve el turno ya guardado. Probado de punta a punta
 * contra ensayo el 2026-10-14: reintento → el mismo turno; doble toque → un
 * solo turno; la clave para otra hora → 409. Esta prueba fija las piezas. */

const RAIZ = join(import.meta.dirname, "..", "..");
const ruta = readFileSync(join(RAIZ, "app/api/catalogo/citas/route.ts"), "utf8");
const panel = readFileSync(join(RAIZ, "components/agenda/gestor-agenda.tsx"), "utf8");

describe("el turno cargado a mano", () => {
  it("la ruta devuelve el turno del intento antes de insertar otro", () => {
    const busca = ruta.indexOf("const guardado = await turnoDelIntento(");
    const inserta = ruta.indexOf('.from("citas")\n    .insert(');
    expect(busca).toBeGreaterThan(-1);
    expect(inserta).toBeGreaterThan(busca);
    expect(ruta).toContain("...(idempotencia ? { idempotencia } : {}),");
  });

  it("el doble toque, que choca con la clave, también recibe el turno guardado", () => {
    expect(ruta).toMatch(/if \(error\?\.code === REPETIDO && idempotencia\) \{\s+const guardado = await turnoDelIntento\(/);
  });

  it("una clave reusada para otro turno no devuelve ese turno", () => {
    expect(ruta).toContain("Ese intento ya se usó para otro turno.");
    expect(ruta).toMatch(/guardado\.recurso_id === pedido\.recursoId &&\s+guardado\.cupo === pedido\.cupo/);
  });

  it("el panel manda la clave y la reusa mientras reintente lo mismo", () => {
    expect(panel).toContain("body: JSON.stringify({ ...turno, idempotencia: intentoManual.current.clave }),");
    expect(panel).toContain("if (intentoManual.current?.firma !== firma) {");
    /* La pausa conserva su inicio: «ahora» cambiaría en cada reintento. */
    expect(panel).toContain("idempotencia: intento.claves[cupo - 1],");
    expect(panel).toContain("const desde = new Date(intento.desde);");
  });
});
