import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

/* Un `<dialog>` abierto con `showModal()` lo centra el navegador con
   `margin: auto`. Pero el reset de Tailwind pone `margin: 0` en **todos** los
   elementos y se lleva puesto ese centrado: el diálogo queda pegado al ángulo
   superior izquierdo.
 *
 * Pasó con el aviso de «la herramienta está trabajando», que fue el único de los
 * cuatro diálogos del proyecto que no declaró su margen. No lo ve el compilador
 * ni el lint, y en el navegador de escritorio con la ventana chica casi no se
 * nota: se descubre mirando un teléfono.
 *
 * Este control busca cada `<dialog>`, averigua con qué clase se dibuja y de qué
 * hoja sale, y exige que esa clase declare un margen. No dice cuál —hay
 * diálogos centrados y hay hojas que suben desde abajo—, solo que la decisión
 * esté tomada a propósito. */
const RAIZ = import.meta.dirname;

function archivosTsx(directorio: string): string[] {
  return readdirSync(directorio).flatMap((nombre) => {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) return archivosTsx(ruta);
    return nombre.endsWith(".tsx") ? [ruta] : [];
  });
}

/* No alcanza con buscar `className={styles.X}`: hay diálogos que combinan dos
   clases en una plantilla de texto, como `${temaStyles.tema} ${styles.hoja}`.
   Se buscan todos los `styles.algo` de la etiqueta de apertura, y la mirada
   hacia atrás descarta los de otros módulos importados con otro nombre. */
function claseDelDialogo(fuente: string): string | null {
  const desde = fuente.indexOf("<dialog");
  if (desde === -1) return null;
  const etiqueta = fuente.slice(desde, fuente.indexOf(">", desde));
  return /(?<![A-Za-z])styles\.([A-Za-z0-9_]+)/.exec(etiqueta)?.[1] ?? null;
}

function hojaImportada(fuente: string, archivo: string): string | null {
  const marca = 'import styles from "';
  const inicio = fuente.indexOf(marca);
  if (inicio === -1) return null;
  const ruta = fuente.slice(inicio + marca.length, fuente.indexOf('"', inicio + marca.length));
  return join(dirname(archivo), ruta);
}

describe("diálogos", () => {
  it("todos deciden su margen en vez de heredar el del reset", () => {
    const conDialogo = archivosTsx(RAIZ).filter((ruta) =>
      readFileSync(ruta, "utf8").includes("<dialog"),
    );

    /* Si el recorrido dejara de encontrarlos, la prueba pasaría sin comprobar
       nada. Los tres que hay son el piso: eran cuatro hasta que la hoja del
       producto se retiró, porque tocar una tarjeta ahora lleva a la página del
       producto en vez de abrir una ventana encima del catálogo. */
    expect(conDialogo.length).toBeGreaterThanOrEqual(3);

    for (const archivo of conDialogo) {
      const fuente = readFileSync(archivo, "utf8");
      const clase = claseDelDialogo(fuente);
      expect(clase, `${archivo}: el diálogo no usa una clase de módulo`).not.toBeNull();

      const hoja = hojaImportada(fuente, archivo);
      expect(hoja, `${archivo}: no se pudo encontrar su hoja`).not.toBeNull();

      const css = readFileSync(hoja!, "utf8");
      const desde = css.indexOf(`.${clase} {`);
      expect(desde, `${hoja!}: no define .${clase}`).toBeGreaterThan(-1);

      const bloque = css.slice(desde, css.indexOf("}", desde));
      expect(bloque, `.${clase} no declara margen y quedará en la esquina`).toContain("margin:");
    }
  });
});
