import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { normalizarTelefonoWhatsappPublico } from "../../lib/whatsapp";

/* Una función que se agrega a tres plantillas de cuatro fue la falla más común
   de este proyecto: se probaba en la que uno tenía abierta, se veía bien, y el
   negocio que eligió la cuarta se quedaba sin ella.

   Con la poda de la fase 6 hay una sola plantilla y esa clase de falla ya no
   puede pasar, pero la prueba se conserva por lo otro que vigila: que el botón
   **exista**. Borrarlo por accidente sigue siendo posible, y no lo atrapa nada
   más —no es un error de tipos ni de lint—. No mira cómo se ve: mira que esté. */
describe("el botón de llamar", () => {
  it("está en el pie del catálogo", () => {
    const fuente = readFileSync(
      join(import.meta.dirname, "mipuesto", "plantilla-mipuesto.tsx"),
      "utf8",
    );
    expect(fuente, "el catálogo no ofrece llamar").toContain("<AccionLlamar");
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
