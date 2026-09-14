/* Arma el módulo de íconos a partir de los de Lucide (ISC).
 *
 * El resultado se guarda en `components/iconos/trazos.ts` y **se versiona**: en
 * producción no se depende de la librería, solo del archivo generado.
 * `lucide-static` queda como dependencia de desarrollo para poder rehacerlo.
 *
 * Se genera en vez de instalar un paquete de componentes de íconos por dos
 * razones. Una: un paquete de íconos trae los mil y pico que tiene la
 * biblioteca y hay que confiar en que el empaquetador descarte los que no se
 * usan. La otra, más importante: acá quedan **solo los que se usan**, con su
 * nombre en español, y agregar uno es una decisión visible en un commit y no
 * un import que aparece en cualquier archivo.
 *
 * Uso: node scripts/armar-iconos.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const iconos = join(raiz, "node_modules", "lucide-static", "icons");
const destino = join(raiz, "components", "iconos", "trazos.ts");

/* El nombre en español a la izquierda y el de Lucide a la derecha. El de la
   izquierda es el que se escribe en las pantallas: quien lee `nombre="tienda"`
   entiende qué se dibuja sin conocer el catálogo de la biblioteca. */
const ICONOS = {
  casa: "house",
  tienda: "store",
  paleta: "palette",
  caja: "package",
  etiqueta: "tag",
  documento: "file-text",
  persona: "circle-user",
  campana: "bell",
  grafico: "chart-column",
  idea: "lightbulb",
  enlace: "link",
  corona: "crown",
  ojo: "eye",
  bolsa: "shopping-bag",
  rayo: "zap",
  codigoQr: "qr-code",
  carpeta: "folder",
  telefono: "phone",
  calendario: "calendar",
  ubicacion: "map-pin",
  flechaArriba: "chevron-up",
};

/* Lucide dibuja sobre un lienzo de 24 con el trazo en `currentColor`. Se guarda
   solo lo de adentro del `<svg>`: el componente pone el lienzo, el grosor y el
   color, así que un ícono no puede traer un color propio que se salga de la
   paleta.

   `fill="currentColor"` **sí se acepta**: algunos íconos rellenan una parte a
   propósito —los puntos de la paleta de pintor son puntos llenos— y ese relleno
   sigue el color del texto, que es lo que se busca. La primera versión de esta
   comprobación los rechazaba a todos y frenó con `palette`. Lo que no se acepta
   es un color escrito, que sería el que se sale de la paleta. */
function contenidoDelIcono(nombreLucide) {
  const svg = readFileSync(join(iconos, `${nombreLucide}.svg`), "utf8");
  /* Se busca el cierre de la etiqueta `<svg`, no el primer `>` del archivo: los
     de Lucide arrancan con un comentario de licencia y ese `>` es el del
     comentario. Con el primero, cada ícono salía con su etiqueta `<svg>`
     completa adentro —lienzo, ancho y alto propios— y el componente habría
     quedado dibujando un SVG dentro de otro. */
  const aperturaSvg = svg.indexOf("<svg");
  const adentro = svg.slice(svg.indexOf(">", aperturaSvg) + 1, svg.lastIndexOf("</svg>"));
  const limpio = adentro
    .replace(/\s+/g, " ")
    .replace(/> </g, "><")
    .trim();

  if (limpio.length === 0) throw new Error(`El ícono ${nombreLucide} salió vacío.`);
  if (limpio.includes("<svg")) {
    throw new Error(`El ícono ${nombreLucide} se llevó su propia etiqueta svg.`);
  }
  const colorPropio = [...limpio.matchAll(/(?:fill|stroke)="([^"]*)"/g)].find(
    ([, valor]) => valor !== "none" && valor !== "currentColor",
  );
  if (colorPropio) {
    throw new Error(`El ícono ${nombreLucide} trae un color propio: ${colorPropio[0]}`);
  }
  return limpio;
}

const entradas = Object.entries(ICONOS)
  .map(([nombre, lucide]) => `  ${nombre}: \`${contenidoDelIcono(lucide)}\`,`)
  .join("\n");

const archivo = `/* GENERADO por scripts/armar-iconos.mjs. No se edita a mano.

   Para agregar un ícono: sumalo a la lista de ese script y volvé a correrlo con
   \`npm run iconos\`. Los trazos vienen de Lucide (licencia ISC) y se guardan
   acá para no depender de la librería en producción.

   Cada valor es el interior de un \`<svg>\` de 24 por 24, con el trazo y el
   relleno en \`currentColor\`: el componente pone el lienzo y el color, así que
   ningún ícono puede traer un color que se salga de la paleta. */

export const TRAZOS = {
${entradas}
} as const;

export type NombreIcono = keyof typeof TRAZOS;
`;

writeFileSync(destino, archivo, "utf8");
console.log(`Íconos generados: ${Object.keys(ICONOS).length} en components/iconos/trazos.ts`);
