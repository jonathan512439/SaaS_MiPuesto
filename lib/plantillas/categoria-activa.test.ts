import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { PLANTILLAS } from "../apariencia";

/* La clásica calculaba `activa` y no la usaba para nada: la variable existía,
   el `aria-pressed` salía bien y visualmente no pasaba nada. La mínima ni
   siquiera tenía estilo para esos botones. Ninguna de las dos cosas rompe una
   prueba de comportamiento ni el compilador, y se descubrieron mirando el
   catálogo.

   Se comprueba lo mínimo que no puede faltar: que cada plantilla ponga la clase
   y que su hoja la defina. */
const RAIZ = join(import.meta.dirname, "..", "..", "components", "templates");

describe("categoría activa en el catálogo", () => {
  it("las cuatro plantillas la marcan y la definen", () => {
    for (const plantilla of PLANTILLAS) {
      const carpeta = join(RAIZ, plantilla);
      const tsx = readFileSync(join(carpeta, `plantilla-${plantilla}.tsx`), "utf8");
      const css = readFileSync(join(carpeta, `plantilla-${plantilla}.module.css`), "utf8");

      /* Dos y no una: el botón «Todo» y el de cada categoría. Buscarla una sola
         vez dejaba pasar el caso real, que era marcar «Todo» y olvidarse de las
         categorías. */
      const usos = tsx.split("styles.categoriaActiva").length - 1;
      expect(usos, `${plantilla} marca ${usos} de los 2 botones`).toBeGreaterThanOrEqual(2);
      expect(css, `${plantilla} no define .categoriaActiva`).toContain(".categoriaActiva");
    }
  });

  /* Con el color de texto también contrastaría, pero el par tiene que ser el
     mismo en las cuatro: si una usa otro, la señal cambia de significado al
     cambiar de plantilla. */
  it("todas usan el par que la guarda de contraste comprueba por paleta", () => {
    for (const plantilla of PLANTILLAS) {
      const css = readFileSync(
        join(RAIZ, plantilla, `plantilla-${plantilla}.module.css`),
        "utf8",
      );
      const desde = css.indexOf(".categoriaActiva");
      const bloque = css.slice(desde, css.indexOf("}", desde));

      expect(bloque, `${plantilla} no pinta el fondo con la marca`).toContain(
        "var(--catalogo-marca)",
      );
      expect(bloque, `${plantilla} no escribe con sobre-marca`).toContain(
        "var(--catalogo-sobre-marca)",
      );
    }
  });
});
