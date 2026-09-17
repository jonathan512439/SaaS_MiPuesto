import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  COLUMNAS_PRODUCTO_PUBLICO,
  COLUMNAS_PRODUCTO_PUBLICO_PAGINADO,
} from "./columnas";

const fuente = readFileSync(join(import.meta.dirname, "pagina-publica.ts"), "utf8");

/* El cuerpo de `consultarProductosPublicos`, que es la consulta que pagina. Las
   otras de este archivo traen cosas que no se paginan y no tienen por qué seguir
   esta regla. */
const consulta = fuente.slice(
  fuente.indexOf("export function consultarProductosPublicos"),
  fuente.indexOf("/* Todo lo que no cambia entre páginas"),
);

/* Cómo se corta una página del catálogo.
 *
 * El catálogo se muestra por categorías y el servidor entrega de doce en doce.
 * Si el corte no respeta las categorías, una queda partida entre dos tandas: se
 * dibujan ocho de «Bebidas», el cliente baja, llegan tres más y se meten adentro
 * de esa sección, que está arriba de todo. El producto parece saltar de la
 * segunda página a la primera y lo que se estaba leyendo se corre hacia abajo.
 *
 * Ordenar primero por la categoría es lo que lo evita: cada tanda es un tramo
 * continuo de categorías, y lo que llega se suma al final de la última sección
 * visible.
 */
describe("el corte de una página del catálogo", () => {
  it("ordena primero por la categoría y después por el producto", () => {
    const ordenes = [...consulta.matchAll(/\.order\("([^"]+)"\)/g)].map(
      ([, columna]) => columna,
    );

    expect(ordenes, "el primer criterio tiene que ser la categoría").toEqual([
      "categorias(orden)",
      "orden",
      "creado_en",
    ]);
  });

  /* PostgREST **rechaza con 400** ordenar por una columna de otra tabla que no
     esté en el `select`. No es una preferencia de estilo: sin el embebido, cada
     visita a cada catálogo devuelve un error. Lo dice con todas las letras
     —«Verify that 'categorias' is included in the 'select'»— pero recién cuando
     alguien abre el catálogo, que es demasiado tarde. */
  it("pide la categoría en el select, que es lo que deja ordenar por ella", () => {
    expect(consulta).toContain("COLUMNAS_PRODUCTO_PUBLICO_PAGINADO");
    expect(COLUMNAS_PRODUCTO_PUBLICO_PAGINADO).toContain("categorias(orden)");
  });

  /* La lista paginada es la pública **más** el orden de la categoría. Si se
     escribieran por separado, alcanzaría con agregar una columna a una para que
     el producto número trece salga distinto del número doce en el mismo
     catálogo. */
  it("no se separa de la lista pública", () => {
    expect(COLUMNAS_PRODUCTO_PUBLICO_PAGINADO.startsWith(COLUMNAS_PRODUCTO_PUBLICO)).toBe(
      true,
    );
  });

  /* Con `orden` y `creado_en` iguales, dos productos podrían salir hoy en un
     lugar y mañana en otro, y con `range` eso significa que uno aparezca en las
     dos páginas y otro en ninguna. El desempate no es un lujo. */
  it("desempata, para que paginar sea estable", () => {
    expect(consulta).toContain('.order("creado_en")');
  });
});
