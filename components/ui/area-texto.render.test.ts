import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AreaTexto, textoDelContador } from "./area-texto";

/* Un campo largo con tope dice cuánto acepta.
 *
 * Cortaba en silencio al llegar al límite: el dueño seguía escribiendo en la
 * descripción del producto y el texto no aparecía, sin saber por qué. */

const dibujar = (value: string, maxLength?: number) =>
  renderToString(jsx(AreaTexto, { id: "d", etiqueta: "Descripción", value, maxLength, onChange: () => {} }));

describe("el contador de caracteres", () => {
  it("dice cuánto lleva y cuánto acepta, y el campo lo anuncia", () => {
    const html = dibujar("hola", 1000);
    expect(html).toContain("4 de 1000 caracteres");
    expect(html).toMatch(/aria-describedby="d-contador"/);
  });

  it("cerca del tope avisa con palabras, no solo con color", () => {
    expect(textoDelContador(960, 1000)).toBe("960 de 1000 caracteres · te quedan 40");
    expect(textoDelContador(1000, 1000)).toBe("1000 de 1000 caracteres · llegaste al límite");
    expect(dibujar("x".repeat(980), 1000)).toContain('data-cerca="si"');
  });

  it("sin tope no hay contador", () => {
    expect(dibujar("hola")).not.toContain("caracteres");
  });
});
