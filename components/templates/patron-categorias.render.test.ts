import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MAXIMO_ICONOS_PATRON } from "../../lib/patrones-fondo";
import { PatronCategorias } from "./patron-categorias";

/* La baldosa del fondo: dieciséis dibujos, todos adentro.
 *
 * El 2026-10-14 pasó de ocho a dieciséis posiciones, a pedido del dueño. Las
 * posiciones son fijas, y un ícono que se sale de la baldosa queda cortado por
 * la mitad y se ve como un error de carga: se comprueba que ninguno se salga. */

const LADO = 384;
const LADO_ICONO = 24;

describe("la baldosa del fondo", () => {
  const html = renderToString(jsx(PatronCategorias, { iconos: ["perro", "hueso", "gato"] }));
  const dibujos = [...html.matchAll(/transform="translate\(([\d.]+) ([\d.]+)\) rotate\(-?[\d.]+\) scale\(([\d.]+)\)"/g)];

  it("dibuja una posición por cada ícono que puede llevar", () => {
    expect(dibujos).toHaveLength(MAXIMO_ICONOS_PATRON);
    expect(html).toContain(`width="${LADO}"`);
  });

  it("ningún ícono se sale de la baldosa", () => {
    for (const [, x, y, escala] of dibujos) {
      const tamano = LADO_ICONO * Number(escala);
      expect(Number(x) + tamano).toBeLessThanOrEqual(LADO);
      expect(Number(y) + tamano).toBeLessThanOrEqual(LADO);
    }
  });

  /* El color sale de la hoja —`currentColor`, que toma `--patron-tinta`—, que es
     lo que gradúa la barra «Cuánto se nota». Un color escrito acá la ignoraría. */
  it("el color lo pone la hoja, no el dibujo", () => {
    expect(html).toContain('stroke="currentColor"');
    expect(html).not.toMatch(/stroke="#|fill="#/);
  });
});
