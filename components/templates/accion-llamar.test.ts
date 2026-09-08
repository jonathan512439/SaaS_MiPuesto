import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PLANTILLAS } from "../../lib/apariencia";
import { normalizarTelefonoWhatsappPublico } from "../../lib/whatsapp";

/* Una función que se agrega a tres plantillas de cuatro es la falla más común de
   este proyecto: se prueba en la que uno tiene abierta, se ve bien, y el negocio
   que eligió la cuarta se queda sin ella y nadie se entera. Esta prueba no mira
   cómo se ve el botón, mira que exista en las cuatro. */
describe("el botón de llamar", () => {
  it("está en las cuatro plantillas", () => {
    for (const plantilla of PLANTILLAS) {
      const fuente = readFileSync(
        join(import.meta.dirname, plantilla, `plantilla-${plantilla}.tsx`),
        "utf8",
      );
      expect(fuente, `${plantilla} no ofrece llamar`).toContain("<AccionLlamar");
    }
  });

  /* Un `tel:` sin código de país marca bien desde adentro de Bolivia y falla
     desde afuera, que es el caso de quien recibe el catálogo de un pariente que
     vive lejos. Se reusa el mismo normalizador que el enlace de WhatsApp para
     que los dos números no puedan diferir. */
  it("completa el código de país igual que WhatsApp", () => {
    expect(normalizarTelefonoWhatsappPublico("71234567")).toBe("59171234567");
    expect(normalizarTelefonoWhatsappPublico("59171234567")).toBe("59171234567");
  });

  /* Sin número no hay botón: un `tel:` vacío abre el marcador en blanco y deja a
     quien lo tocó sin saber qué pasó. */
  it("no se dibuja sin número", () => {
    expect(normalizarTelefonoWhatsappPublico("")).toBe("");
  });
});
