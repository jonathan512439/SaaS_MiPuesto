import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/* El isotipo lo usan cinco pantallas y **cada una trae su propia clase
   `.isotipo`** con la altura que le corresponde. Si este componente declara
   además un tamaño, quedan dos reglas de un solo selector de clase compitiendo,
   y gana la que el paquete deja última, no la que el autor cree.

   Pasó: con `height: 100%` acá, en el panel el logotipo salió del alto de media
   pantalla y empujó el nombre debajo del botón «Salir». No lo atrapa el
   compilador, ni el lint, ni ninguna prueba de comportamiento: se ve mirando un
   teléfono.

   El tamaño de reserva va en los atributos del SVG, a los que cualquier regla de
   CSS le gana sin depender del orden. */
const CARPETA = import.meta.dirname;
const css = readFileSync(join(CARPETA, "isotipo.module.css"), "utf8");
const tsx = readFileSync(join(CARPETA, "isotipo.tsx"), "utf8");

describe("isotipo", () => {
  it("su hoja no declara tamaño, para no pelearle a quien lo usa", () => {
    const bloque = css.slice(css.indexOf(".isotipo"));
    for (const propiedad of ["height:", "width:", "inline-size:", "block-size:"]) {
      expect(bloque, `la hoja del isotipo declara ${propiedad}`).not.toContain(propiedad);
    }
  });

  it("trae un tamaño de reserva en los atributos", () => {
    expect(tsx).toContain('height="30"');
    expect(tsx).toContain('width="24"');
  });

  /* Sin esto el símbolo saldría negro sobre la barra teal del panel, que fue
     justamente el motivo de pasarlo a vector. */
  it("toma el color de donde esté", () => {
    expect(tsx).toContain('stroke="currentColor"');
  });
});
