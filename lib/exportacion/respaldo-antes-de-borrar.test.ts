import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/* «El cambio de rubro exporta antes de borrar, y si la exportación falla no
 * borra nada.» Es una regla del plan, y es una regla de **orden**: las dos
 * operaciones existen, hacen lo suyo, y el único modo de que la regla se rompa
 * es que alguien las ponga al revés o que meta el borrado antes de la copia.
 *
 * Eso no lo atrapa ningún tipo ni ninguna prueba de comportamiento —el código
 * compila igual y hace las dos cosas igual—, y no se nota nunca: se notaría el
 * día que un comerciante pida su catálogo de vuelta y no haya ninguno. Así que
 * se comprueba sobre el texto del archivo, que es donde vive el orden.
 */
const RUTA = join(
  import.meta.dirname,
  "..",
  "..",
  "app",
  "api",
  "plataforma",
  "negocios",
  "[id]",
  "rubro",
  "route.ts",
);

describe("el cambio de rubro", () => {
  const codigo = readFileSync(RUTA, "utf8");

  it("arma la planilla antes de llamar al borrado", () => {
    const copia = codigo.indexOf("exportarCatalogo(");
    const borrado = codigo.indexOf('"admin_cambiar_rubro"');

    expect(copia, "la ruta ya no arma la planilla").toBeGreaterThan(-1);
    expect(borrado, "la ruta ya no llama a admin_cambiar_rubro").toBeGreaterThan(-1);
    expect(copia, "el borrado quedó antes que la copia").toBeLessThan(borrado);
  });

  it("corta si no pudo leer el catálogo, en vez de seguir con una copia a medias", () => {
    /* Una lectura fallida que se ignore deja una planilla vacía, y una planilla
       vacía pasa por copia buena: el borrado seguiría y nadie vería nada raro
       hasta necesitar el archivo. */
    const antesDelBorrado = codigo.slice(0, codigo.indexOf('"admin_cambiar_rubro"'));
    expect(antesDelBorrado).toContain("productos.error");
    expect(antesDelBorrado).toContain("categorias.error");
    expect(antesDelBorrado).toContain("subcategorias.error");
  });

  it("la planilla es la respuesta, y no un aviso de que todo salió bien", () => {
    /* Si la respuesta fuera un «listo» y la copia viviera en otro lado, serían
       dos cosas que fallan por separado, y la que importa es la que nadie mira
       hasta que la necesita. */
    expect(codigo).toContain("spreadsheetml.sheet");
  });
});
