import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Formulario } from "./formulario";

/* Lo que manda el servidor: un formulario que todavía no se puede tocar.
 *
 * Es la mitad que se puede ver sin navegador —la otra, que al cargar se
 * libera, la cubre la reproducción de punta a punta del 2026-10-13—. Si el
 * servidor lo mandara sin `inert`, se podría elegir antes de que cargue y lo
 * elegido se perdería. */

describe("Formulario", () => {
  it("llega del servidor por POST y sin dejarse tocar", () => {
    const html = renderToString(
      jsx(Formulario, {
        className: "x",
        children: jsx("select", { id: "modalidad", defaultValue: "a", children: jsx("option", { value: "a" }) }),
      }),
    );
    expect(html).toMatch(/<form[^>]*method="post"/);
    expect(html).toMatch(/<form[^>]*\binert=""/);
    expect(html).toContain('class="x"');
    expect(html).toContain('id="modalidad"');
  });
});
