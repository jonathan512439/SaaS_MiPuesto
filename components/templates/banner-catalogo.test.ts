import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PLANTILLAS } from "../../lib/apariencia";
import { MAXIMO_BANNERS } from "../../lib/negocios/banners";

/* Misma falla que persigue la prueba del botón de llamar: una función que se
   agrega a tres plantillas de cuatro. El dueño carga su banner, lo ve en la
   demostración —que usa otra plantilla— y en su catálogo no aparece. */
describe("los banners del catálogo", () => {
  const fuenteDe = (plantilla: string) =>
    readFileSync(join(import.meta.dirname, plantilla, `plantilla-${plantilla}.tsx`), "utf8");

  it("están en todas las plantillas, arriba y abajo", () => {
    for (const plantilla of PLANTILLAS) {
      const fuente = fuenteDe(plantilla);
      expect(fuente, `${plantilla} no dibuja el banner de arriba`).toContain(
        "<BannerCatalogo banner={datos.negocio.banners[0]} />",
      );
      expect(fuente, `${plantilla} no dibuja el banner de abajo`).toContain(
        "<BannerCatalogo banner={datos.negocio.banners[1]} />",
      );
    }
  });

  /* El de arriba va después del aviso de horario y el de abajo antes del pie.
     Ese orden es el de las maquetas, y si una plantilla lo invierte el negocio
     ve su promoción en un lugar distinto según qué diseño eligió. */
  it("respetan el orden en las cuatro", () => {
    for (const plantilla of PLANTILLAS) {
      const fuente = fuenteDe(plantilla);
      const arriba = fuente.indexOf("banners[0]");
      const abajo = fuente.indexOf("banners[1]");
      expect(arriba, `${plantilla}: falta el de arriba`).toBeGreaterThan(-1);
      expect(abajo, `${plantilla}: el de abajo no va después`).toBeGreaterThan(arriba);
    }
  });

  /* La pieza lee dos posiciones del arreglo. Si el techo subiera a tres sin
     tocar las plantillas, el tercero se guardaría y no lo vería nadie. */
  it("las plantillas dibujan tantos como admite el modelo", () => {
    expect(MAXIMO_BANNERS).toBe(2);
  });
});
