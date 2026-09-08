import { describe, expect, it } from "vitest";

import { TRAZOS } from "./trazos";

/* `trazos.ts` lo genera un script y se versiona. Un archivo generado que se
   versiona invita a editarlo a mano cuando falta algo, y ahí es donde entra un
   color escrito que se sale de la paleta o un ícono a medio pegar.
 *
 * Estas comprobaciones son las mismas que hace el generador, corridas del otro
 * lado: si alguien edita el archivo en vez de la lista del script, se cae acá. */
describe("los íconos generados", () => {
  it("no traen ningún color propio", () => {
    for (const [nombre, trazo] of Object.entries(TRAZOS)) {
      const colores = [...trazo.matchAll(/(?:fill|stroke)="([^"]*)"/g)].map(([, valor]) => valor);
      const ajenos = colores.filter((valor) => valor !== "none" && valor !== "currentColor");
      expect(ajenos, `${nombre} trae un color fuera de la paleta`).toEqual([]);
    }
  });

  /* El generador extrae el interior del `<svg>`. Su primera versión cortaba por
     el primer `>` del archivo, que es el del comentario de licencia, y cada
     ícono salía con su propia etiqueta `<svg>` adentro: un lienzo dentro de otro
     lienzo, con ancho y alto propios que ignoraban el del componente. */
  it("son el interior de un svg y no un svg entero", () => {
    for (const [nombre, trazo] of Object.entries(TRAZOS)) {
      expect(trazo, `${nombre} se llevó su etiqueta svg`).not.toContain("<svg");
      expect(trazo.length, `${nombre} salió vacío`).toBeGreaterThan(0);
    }
  });

  /* El componente los inyecta como HTML. Es seguro porque el contenido es
     generado y versionado, nunca escrito por un usuario, pero conviene que una
     prueba diga qué se está dando por sentado: nada de scripts ni de eventos. */
  it("no contienen nada ejecutable", () => {
    for (const [nombre, trazo] of Object.entries(TRAZOS)) {
      expect(trazo.toLowerCase(), `${nombre} trae algo ejecutable`).not.toMatch(
        /<script|on[a-z]+=|javascript:/,
      );
    }
  });
});
