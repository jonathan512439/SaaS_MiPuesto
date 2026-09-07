/* Arma las baldosas de fondo a partir de los íconos de Lucide (ISC).
 *
 * El resultado se guarda en `public/patrones/` y se versiona: en producción no
 * se depende de la librería, solo del archivo generado. `lucide-static` queda
 * como dependencia de desarrollo para poder rehacer la baldosa, no para
 * servirla.
 *
 * La baldosa se usa como **máscara**, no como imagen de fondo. Un SVG puesto
 * de fondo no puede leer el color de la paleta del negocio: el color quedaría
 * escrito dentro del archivo y harían falta siete rubros por siete paletas.
 * Como máscara, el archivo aporta la forma y el color sigue saliendo de la
 * paleta. Por eso los trazos van en negro opaco: de la máscara solo se lee el
 * canal alfa, el color del archivo da igual.
 *
 * Uso: node scripts/armar-patrones.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const iconos = join(raiz, "node_modules", "lucide-static", "icons");
const destino = join(raiz, "public", "patrones");

/* Lado de la baldosa y cuantos objetos entran. Con una baldosa chica el ojo
   encuentra la grilla enseguida, asi que se mantiene grande y la densidad sube
   por la cantidad: veinticinco objetos en cinco columnas, contra los dieciseis
   en cuatro de la primera prueba. Despues el CSS la dibuja mas chica, que
   aprieta el dibujo sin volver a generarlo.

   Las dos cifras van juntas: `COLUMNAS` al cuadrado tiene que dar la cantidad de
   nombres, o las ultimas filas caen fuera de la baldosa. */
const LADO = 360;
const COLUMNAS = 5;

/* Generador con semilla y no `Math.random()`: la baldosa tiene que salir igual
   en cada máquina, o cada quien versiona un archivo distinto sin haber tocado
   nada. */
function azarConSemilla(semilla) {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 4294967296;
  };
}

function cuerpoDelIcono(nombre) {
  const svg = readFileSync(join(iconos, `${nombre}.svg`), "utf8");
  const apertura = svg.indexOf(">", svg.indexOf("<svg"));
  const cierre = svg.lastIndexOf("</svg>");
  if (apertura === -1 || cierre === -1) throw new Error(`No se pudo leer ${nombre}.svg`);
  return svg
    .slice(apertura + 1, cierre)
    .replace(/\s+/g, " ")
    .trim();
}

/* Los objetos se reparten en una grilla con sacudida, no al azar puro: al azar
   puro se amontonan en unos lados y dejan huecos en otros, y el hueco se ve
   como un error de carga. La sacudida rompe la grilla sin dejar claros. */
function componer({ archivo, nombres, semilla, trazo }) {
  if (nombres.length !== COLUMNAS * COLUMNAS) {
    throw new Error(
      `${archivo}: ${nombres.length} objetos para una grilla de ${COLUMNAS}x${COLUMNAS}.`,
    );
  }
  if (new Set(nombres).size !== nombres.length) {
    throw new Error(`${archivo}: hay un objeto repetido.`);
  }

  const azar = azarConSemilla(semilla);
  const celda = LADO / COLUMNAS;
  const piezas = [];

  nombres.forEach((nombre, indice) => {
    const columna = indice % COLUMNAS;
    const fila = Math.floor(indice / COLUMNAS);
    const escala = 1.15 + azar() * 0.55;
    const giro = Math.round((azar() * 2 - 1) * 26);
    const x = celda * (columna + 0.5) + (azar() * 2 - 1) * celda * 0.3;
    const y = celda * (fila + 0.5) + (azar() * 2 - 1) * celda * 0.3;
    const radio = 12 * escala + 4;
    const cuerpo = cuerpoDelIcono(nombre);

    /* El objeto que toca un borde se dibuja también del otro lado. Sin esto la
       baldosa calza mal con la de al lado y aparece una calle vacía cada 360
       píxeles, que es exactamente la grilla que se quería esconder. */
    for (const dx of [-LADO, 0, LADO]) {
      for (const dy of [-LADO, 0, LADO]) {
        const cx = x + dx;
        const cy = y + dy;
        if (cx + radio < 0 || cx - radio > LADO) continue;
        if (cy + radio < 0 || cy - radio > LADO) continue;
        piezas.push(
          `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${giro}) scale(${escala.toFixed(3)}) translate(-12 -12)" stroke-width="${(trazo / escala).toFixed(2)}">${cuerpo}</g>`,
        );
      }
    }
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LADO} ${LADO}" width="${LADO}" height="${LADO}">`,
    /* Negro opaco a propósito: como máscara solo cuenta el canal alfa. */
    `<g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round">`,
    piezas.join(""),
    `</g></svg>`,
  ].join("");
}

const BALDOSAS = [
  {
    archivo: "restaurante.svg",
    semilla: 20260907,
    trazo: 1.7,
    nombres: [
      "utensils-crossed", "coffee", "pizza", "cup-soda", "croissant",
      "ice-cream-cone", "soup", "salad", "sandwich", "cake-slice",
      "egg-fried", "fish", "drumstick", "cooking-pot", "chef-hat",
      "wheat", "beer", "apple", "carrot", "cookie",
      "milk", "popcorn", "donut", "hamburger", "bottle-wine",
    ],
  },
  {
    archivo: "ferreteria.svg",
    semilla: 20260908,
    trazo: 1.7,
    nombres: [
      "hammer", "wrench", "drill", "ruler", "nut",
      "bolt", "paint-roller", "paintbrush-2", "paint-bucket", "pickaxe",
      "construction", "hard-hat", "plug", "lightbulb", "key",
      "axe", "shovel", "magnet", "blocks", "layers",
      "battery", "cog", "package-open", "boxes", "pen-tool",
    ],
  },
  {
    archivo: "tienda-barrio.svg",
    semilla: 20260909,
    trazo: 1.7,
    nombres: [
      "shopping-basket", "shopping-cart", "can", "package", "receipt",
      "scale", "milk", "egg", "banana", "candy",
      "newspaper", "battery", "cigarette", "brush-cleaning", "refrigerator",
      "barcode", "calculator", "coins", "banknote", "wallet",
      "store", "tag", "truck", "box", "percent",
    ],
  },
  {
    archivo: "ropa-calzado.svg",
    semilla: 20260910,
    trazo: 1.7,
    nombres: [
      "shirt", "sport-shoe", "footprints", "glasses", "watch",
      "backpack", "umbrella", "hat-glasses", "graduation-cap", "crown",
      "gem", "scissors", "ruler", "tag", "shopping-bag",
      "sparkles", "star", "heart", "baby", "venetian-mask",
      "percent", "ticket", "hand", "shopping-basket", "box",
    ],
  },
  {
    archivo: "belleza.svg",
    semilla: 20260911,
    trazo: 1.7,
    nombres: [
      "scissors", "brush", "sparkles", "droplet", "flower",
      "flower-2", "mirror-round", "spray-can", "bath", "gem",
      "crown", "hand-heart", "leaf", "eye", "heart",
      "smile", "sun-medium", "wind", "venetian-mask", "star",
      "paintbrush-2", "watch", "glasses", "baby", "pill",
    ],
  },
  {
    archivo: "servicios.svg",
    semilla: 20260912,
    trazo: 1.7,
    nombres: [
      "calendar", "clock", "phone", "map-pin", "briefcase",
      "car", "laptop", "printer", "stethoscope", "syringe",
      "key", "wifi", "handshake", "badge-check", "clipboard-list",
      "notebook-pen", "cog", "wrench", "hard-hat", "plug",
      "truck", "receipt", "bandage", "megaphone", "ticket",
    ],
  },
  {
    /* «Otro» no tiene oficio que dibujar, así que se dibuja lo único que todos
       comparten: la venta. Bolsa, etiqueta, recibo, vitrina, apretón de manos.
       La alternativa era una trama abstracta, pero entonces el negocio sin rubro
       sería el único con un fondo que no habla de nada, y eso se lee como que
       faltó configurar algo. */
    archivo: "otro.svg",
    semilla: 20260913,
    trazo: 1.7,
    nombres: [
      "shopping-bag", "tag", "store", "receipt", "wallet",
      "coins", "banknote", "credit-card", "gift", "star",
      "heart", "package", "truck", "handshake", "badge-check",
      "phone", "map-pin", "calendar", "smile", "sparkles",
      "circle-dollar-sign", "shopping-cart", "megaphone", "thumbs-up", "ticket",
    ],
  },
];

mkdirSync(destino, { recursive: true });

for (const baldosa of BALDOSAS) {
  const svg = componer(baldosa);
  writeFileSync(join(destino, baldosa.archivo), `${svg}\n`, "utf8");
  console.log(`${baldosa.archivo}: ${baldosa.nombres.length} objetos, ${svg.length} bytes.`);
}
