import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ISOTIPO_PIEZAS, ISOTIPO_TOLDO } from "../../lib/marca/isotipo";

const CARPETA = import.meta.dirname;
const css = readFileSync(join(CARPETA, "introduccion.module.css"), "utf8");
const tsx = readFileSync(join(CARPETA, "introduccion.tsx"), "utf8");

/* El trazo del toldo, medido del PNG original píxel por píxel.
 *
 * Está escrito acá entero **a propósito**: es la copia independiente contra la
 * que se comprueba la de `lib/marca/isotipo.ts`. Si saliera de ahí, la prueba se
 * compararía consigo misma y no diría nada. */
const TOLDO_ORIGINAL =
  "M21 95 C21 56 44 23 66 23 L190 23 C212 23 234 56 234 95 " +
  "Q198.5 149 164 95 Q128 149 92 95 Q56.5 149 21 95 Z";

/* El cuerpo de una regla o de un `@keyframes`, **hasta su llave y no más**.
 *
 * Recortar «desde acá hasta el final del archivo» es lo que vuelve inútil a una
 * prueba de hoja de estilos: busca una línea, la encuentra cincuenta reglas más
 * abajo y da por buena una que ya no está. Le pasó a esta misma prueba: sacarle
 * `visibility: hidden` al último fotograma no la hacía fallar, porque lo
 * encontraba en la regla de la capa saltada.
 *
 * La llave de cierre en la columna 0 es la del bloque que se pidió; las de
 * adentro van indentadas. */
function bloque(marca: string): string {
  const inicio = css.indexOf(marca);
  if (inicio === -1) return "";
  const fin = css.indexOf("\n}", inicio);
  return css.slice(inicio, fin === -1 ? undefined : fin);
}

describe("la presentación de la marca", () => {
  /* La animación dibuja el isotipo pieza por pieza, y para eso el toldo —que en
     todos los demás lados es un solo trazo cerrado— hubo que partirlo. Partirlo
     es donde se pierde un dibujo: alcanza con mover un punto de control de una
     onda para que el logotipo de la animación deje de ser el de la barra del
     panel y el de la marca de agua del QR.

     Por eso el trazo entero se **arma** con los pedazos en vez de convivir con
     ellos, y acá se comprueba que lo armado sea exactamente lo que se midió. */
  it("las piezas siguen siendo el mismo dibujo de siempre", () => {
    expect(ISOTIPO_TOLDO).toBe(TOLDO_ORIGINAL);
  });

  it("las cinco piezas son las cinco del isotipo, cada una con su clase", () => {
    expect(ISOTIPO_PIEZAS.map(({ nombre }) => nombre)).toEqual([
      "mostrador",
      "techo",
      "ondaPrimera",
      "ondaSegunda",
      "ondaTercera",
    ]);

    /* Una pieza sin regla se dibujaría entera desde el primer fotograma, sin
       animarse y sin que nadie se entere. */
    for (const { nombre } of ISOTIPO_PIEZAS) {
      expect(css, `falta la demora de .${nombre}`).toContain(`.${nombre} {`);
    }
  });

  /* Cada onda arranca donde termina la anterior. Si una empezara en otro punto,
     el trazo se vería saltar de un lado al otro mientras se dibuja. */
  it("las ondas se encadenan sin saltos", () => {
    const ondas = ISOTIPO_PIEZAS.filter(({ nombre }) => nombre.startsWith("onda"));
    const inicios = ondas.map(({ trazo }) => trazo.slice(1, trazo.indexOf(" Q")));
    const finales = ondas.map(({ trazo }) => {
      const ultimoEspacio = trazo.lastIndexOf(" ");
      return trazo.slice(trazo.lastIndexOf(" ", ultimoEspacio - 1) + 1);
    });

    expect(ondas).toHaveLength(3);
    expect(inicios.slice(1)).toEqual(finales.slice(0, -1));
  });

  /* **La prueba que más importa.**
   *
   * La capa es una pantalla completa fija encima de todo. Si el último
   * fotograma dejara de esconderla, el sitio entero quedaría detrás de un vidrio
   * invisible: se vería bien y no respondería a nada. No lo atrapa el compilador
   * ni el lint, porque es CSS que dejó de decir una línea.
   *
   * Son dos seguros y hacen falta los dos: `visibility: hidden` la saca del paso
   * al terminar, y `pointer-events: none` hace que mientras tanto tampoco ataje
   * nada —que es lo que permite tocar el catálogo con la marca todavía en
   * pantalla—. */
  it("no deja el sitio detrás de un vidrio", () => {
    const revelar = bloque("@keyframes revelarPagina");
    expect(revelar, "falta la animación que libera la página").not.toBe("");
    const final = revelar.slice(revelar.lastIndexOf("100%"));
    expect(final, "el último fotograma tiene que esconder la capa").toContain(
      "visibility: hidden",
    );

    const capa = bloque(".introduccion {");
    expect(capa, "la capa no puede atajar toques").toContain("pointer-events: none");
  });

  /* La capa nace escondida y solo el guion la muestra.
   *
   * Antes era al revés: salía por defecto y el guion la escondía. Pero el guion
   * corre solo cuando la página se carga entera, así que quien entraba por un
   * producto compartido y volvía al catálogo con «Ver pedido» —una navegación
   * interna, sin guion— veía la marca tapándole el pedido 4 o 5 segundos, y sin
   * poder cortarla, porque quien escucha el toque también es el guion. */
  it("nace escondida: solo una entrada nueva la presenta", () => {
    const capa = bloque(".introduccion {");
    expect(capa, "la capa tiene que nacer escondida").toContain("display: none");
    expect(capa, "la animación va con la presentación, no con la capa").not.toContain(
      "animation:",
    );

    const presentando = bloque(':global(html[data-marca="presentando"]) .introduccion {');
    expect(presentando, "falta la regla que la presenta").toContain("display: grid");
    expect(presentando).toContain("revelarPagina");
    expect(tsx).toContain('r.dataset.marca="presentando"');
  });

  /* Sale una vez por sesión y se corta al primer toque. Las dos cosas las hace
     el guion que corre antes de pintar; sin él, la segunda visita mostraría el
     logotipo un instante y lo borraría de golpe. */
  it("sabe irse antes: una vez por sesión y al primer toque", () => {
    expect(tsx).toContain("sessionStorage");
    for (const evento of ["pointerdown", "wheel", "touchmove", "keydown"]) {
      expect(tsx, `no escucha ${evento} para cortarse`).toContain(evento);
    }
    expect(css).toContain('html[data-marca="vista"]');
    expect(css).toContain('html[data-marca="saltada"]');
  });

  /* El guion toca el `<html>` antes de que React hidrate, así que el del
     servidor y el del navegador no coinciden a propósito. Sin
     `suppressHydrationWarning` en la raíz, cada visita al catálogo deja un aviso
     de hidratación en la consola que tapa los que sí serían un error. */
  it("la raíz acepta que el guion la marque antes de hidratar", () => {
    const layout = readFileSync(join(CARPETA, "../../app/layout.tsx"), "utf8");
    expect(tsx).toContain("r.dataset.marca=");
    expect(layout, "falta suppressHydrationWarning en <html>").toMatch(
      /<html[^>]*\ssuppressHydrationWarning[\s>]/,
    );
  });

  /* Es el único script en línea que no escribe vinext. Sin el nonce, la
     política de contenido lo bloquea y la animación sale en cada visita. */
  it("el guion lleva el nonce de la solicitud", () => {
    expect(tsx).toMatch(/<script[^>]*\snonce=\{nonce\}/);
    expect(tsx).toContain("get(CABECERA_NONCE)");
  });

  /* Quien pidió no ver movimiento no lo ve, y el papel no lleva una hoja en
     blanco con el logotipo. */
  it("respeta a quien no quiere movimiento, y no se imprime", () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce\), print/);
    /* La regla que la presenta pesa más que `.introduccion` sola: la de
       movimiento reducido tiene que pesar lo mismo y venir después, o la marca
       volvería a salir justo para quien pidió que no. */
    const reducido = bloque("@media (prefers-reduced-motion: reduce), print {");
    expect(reducido, "tiene que ganarle a la regla que la presenta").toContain(
      ":global(html[data-marca]) .introduccion",
    );
  });

  /* Ocho letras, ocho demoras. Si el nombre cambiara y las reglas no, las
     últimas letras saldrían todas juntas al final. */
  it("tiene una demora por cada letra del nombre", () => {
    const nombre = /const NOMBRE = "([^"]+)"/.exec(tsx)?.[1];
    expect(nombre).toBeDefined();

    const demoras = css.match(/\.letra:nth-child\(\d+\)/g) ?? [];
    expect(demoras.length, `«${nombre}» tiene ${nombre?.length} letras`).toBe(nombre?.length);
  });
});
