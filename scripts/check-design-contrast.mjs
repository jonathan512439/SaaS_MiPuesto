import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const raizProyecto = fileURLToPath(new URL("..", import.meta.url));

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const cssPaletas = readFileSync(
  new URL("../components/templates/tema-catalogo.module.css", import.meta.url),
  "utf8",
);

/* Las paletas se descubren en el CSS en vez de mantenerse en una lista aparte:
   con una lista escrita a mano, agregar una paleta y olvidarse de sumarla aqui
   la dejaria sin control de contraste, que es justo lo que este archivo evita. */
function descubrirPaletas() {
  const encontradas = [...cssPaletas.matchAll(/\.tema\[data-paleta="([a-z0-9-]+)"\]/g)].map(
    (coincidencia) => coincidencia[1],
  );
  const unicas = [...new Set(encontradas)];

  if (unicas.length === 0) throw new Error("No se encontró ninguna paleta en el tema.");
  return unicas;
}

/* Una paleta o una plantilla vive en cuatro sitios: el CSS del tema, el
   registro de apariencia, el validador y la restriccion de la base. Si alguno
   queda atras, el dueno puede elegir algo que la base rechaza, o al reves.
   Comparar los cuatro es mas barato que descubrirlo en produccion. */
function leerListaTs(fuente, constante) {
  const inicio = fuente.indexOf(constante);
  if (inicio === -1) throw new Error(`No se encontró ${constante} en lib/apariencia.ts.`);
  const corchete = fuente.indexOf("[", inicio);
  const cierre = fuente.indexOf("];", corchete);
  if (corchete === -1 || cierre === -1) {
    throw new Error(`No se pudo delimitar ${constante}.`);
  }
  const bloque = fuente.slice(corchete, cierre);
  return [...bloque.matchAll(/id:\s*"([a-z0-9-]+)"/g)].map((c) => c[1]);
}

function leerConstanteTs(fuente, constante) {
  const inicio = fuente.indexOf(`const ${constante} = [`);
  if (inicio === -1) throw new Error(`No se encontró la constante ${constante}.`);
  const corchete = fuente.indexOf("[", inicio);
  const cierre = fuente.indexOf("]", corchete);
  return [...fuente.slice(corchete, cierre).matchAll(/"([a-z0-9-]+)"/g)].map((c) => c[1]);
}

function leerRestriccionSql(columna) {
  const carpeta = new URL("../supabase/migrations/", import.meta.url);
  const archivos = readdirSync(carpeta).filter((n) => n.endsWith(".sql")).sort();
  let ultima = null;

  for (const archivo of archivos) {
    const sql = readFileSync(new URL(archivo, carpeta), "utf8");
    for (const coincidencia of sql.matchAll(
      new RegExp(`${columna} in \\(([^)]*)\\)`, "g"),
    )) {
      /* El guion bajo va en la clase a propósito. Sin él, un valor como
         `tienda_barrio` no coincide con nada y **desaparece de la lista en
         silencio**: la comparación seguiría corriendo y diría que la base tiene
         menos valores de los que tiene. Hoy esto solo se usa con paletas y
         plantillas, que no llevan guion bajo, así que funcionaba por casualidad;
         el día que se apunte a otra columna, mentiría. */
      ultima = [...coincidencia[1].matchAll(/'([a-z0-9_-]+)'/g)].map((c) => c[1]);
    }
  }

  if (!ultima) throw new Error(`No se encontró la restricción de ${columna}.`);
  return ultima;
}

function compararListas(nombre, esperado, actual, origen) {
  const faltan = esperado.filter((valor) => !actual.includes(valor));
  const sobran = actual.filter((valor) => !esperado.includes(valor));

  if (faltan.length || sobran.length) {
    throw new Error(
      `${nombre} desincronizado en ${origen}.` +
        (faltan.length ? ` Faltan: ${faltan.join(", ")}.` : "") +
        (sobran.length ? ` Sobran: ${sobran.join(", ")}.` : ""),
    );
  }
}

function mezclar(colorA, colorB, proporcionA) {
  const canales = (hexadecimal) =>
    hexadecimal.slice(1).match(/.{2}/g).map((canal) => Number.parseInt(canal, 16));
  const a = canales(colorA);
  const b = canales(colorB);
  const parte = proporcionA / 100;
  return (
    "#" +
    a
      .map((valor, indice) =>
        Math.round(valor * parte + b[indice] * (1 - parte))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/* Resuelve un token de color a su hexadecimal, sea un valor escrito o una
   mezcla de otros dos.

   Antes solo leía hexadecimales, y eso dejaba **fuera de control a los colores
   derivados**, que son la mayoría: el fondo de la página, los tonos tenues, el
   texto suave. Justamente los que se ajustan a ojo y donde un contraste se
   pierde sin que nadie lo note.

   Una mezcla contra `transparent` devuelve `null`: sin saber qué hay detrás no
   se puede calcular su contraste, y afirmar uno sería peor que no comprobarlo. */
function leerColor(token, vistos = new Set(), sustitutos = {}) {
  if (vistos.has(token)) throw new Error(`El token --color-${token} se define en círculo.`);
  vistos.add(token);

  /* El panel pintado con la paleta de un negocio reasigna `marca` y `accion`, y
     **todo lo demás se recalcula solo** porque está derivado de esos dos con
     `color-mix`. Comprobar la paleta nueva es, entonces, resolver los mismos
     tokens cambiando las dos bases: si se leyeran de la hoja global se
     comprobaría diez veces el mismo color de MiPuesto y no se vería nada. */
  if (sustitutos[token]) return sustitutos[token];

  const declaracion = css.match(new RegExp(`--color-${token}:\\s*([^;]+);`));
  if (!declaracion) throw new Error(`No se encontró el token --color-${token}.`);
  const valor = declaracion[1].trim();

  if (/^#[0-9a-fA-F]{6}$/.test(valor)) return valor;

  const mezcla = valor.match(
    /^color-mix\(\s*in srgb\s*,\s*var\(--color-([a-z-]+)\)\s*(\d+)%\s*,\s*(?:var\(--color-([a-z-]+)\)|(transparent))\s*\)$/,
  );
  if (!mezcla) return null;

  const [, primero, proporcion, segundo, transparente] = mezcla;
  if (transparente) return null;

  const colorA = leerColor(primero, new Set(vistos), sustitutos);
  const colorB = leerColor(segundo, new Set(vistos), sustitutos);
  if (!colorA || !colorB) return null;

  return mezclar(colorA, colorB, Number(proporcion));
}

function luminancia(hexadecimal) {
  const canales = hexadecimal
    .slice(1)
    .match(/.{2}/g)
    .map((canal) => Number.parseInt(canal, 16) / 255)
    .map((canal) =>
      canal <= 0.04045
        ? canal / 12.92
        : ((canal + 0.055) / 1.055) ** 2.4,
    );

  return canales[0] * 0.2126 + canales[1] * 0.7152 + canales[2] * 0.0722;
}

function contraste(colorA, colorB) {
  const luminanciaA = luminancia(colorA);
  const luminanciaB = luminancia(colorB);
  const clara = Math.max(luminanciaA, luminanciaB);
  const oscura = Math.min(luminanciaA, luminanciaB);
  return (clara + 0.05) / (oscura + 0.05);
}

function leerColoresPaleta(paleta) {
  const bloque = cssPaletas.match(
    /* El selector agrupa dos clases —`.tema` pinta, `.paleta` solo declara—
       y entre el nombre de la paleta y la llave hay otro selector. Sin esta
       tolerancia el control no encontraba ninguna paleta. */
    new RegExp(`\\.tema\\[data-paleta="${paleta}"\\][^{]*\\{([\\s\\S]*?)\\}`),
  )?.[1];

  if (!bloque) throw new Error(`No se encontró la paleta ${paleta}.`);

  const colores = Object.fromEntries(
    ["superficie", "texto", "marca", "sobre-marca", "accion", "sobre-accion", "exito", "alerta"].map(
      (token) => {
        const valor = bloque.match(
          new RegExp(`--catalogo-${token}:\\s*(#[0-9a-fA-F]{6})\\s*;`),
        )?.[1];

        if (!valor) throw new Error(`No se encontró --catalogo-${token} en ${paleta}.`);
        return [token, valor];
      },
    ),
  );

  /* La cabecera del catálogo, que es donde viven «Cómo llegar» y «Calificar».
   *
   * Sus dos colores no estaban en esta lista y **no los comprobaba nadie**. En la
   * mayoría de las paletas coinciden con la marca, que sí se mira, pero no en
   * todas: las oscuras los llevan a su superficie y «Día y noche» declara un azul
   * propio para la barra. Ahí un botón de la cabecera podía quedar sin contraste
   * y ninguna guardia se enteraba.
   *
   * Cada paleta puede declararlos como un hexadecimal, como `var(--catalogo-x)`
   * apuntando a otro de sus colores, o no declararlos: en ese último caso rige el
   * valor de omisión del tema, que es la marca. */
  const deLaCabecera = (token, omision) => {
    const valor = bloque.match(new RegExp(`--catalogo-${token}:\\s*([^;]+);`))?.[1]?.trim();
    if (!valor) return colores[omision];
    if (/^#[0-9a-fA-F]{6}$/.test(valor)) return valor;

    const referencia = valor.match(/^var\(--catalogo-([a-z-]+)\)$/)?.[1];
    if (referencia && colores[referencia]) return colores[referencia];

    throw new Error(`No se pudo resolver --catalogo-${token} en ${paleta}: ${valor}`);
  };

  colores.navegador = deLaCabecera("navegador", "marca");
  colores["sobre-navegador"] = deLaCabecera("sobre-navegador", "sobre-marca");
  /* La cortina sobre la portada y el banner, y la letra que va encima. Las
     paletas claras no la declaran y rige la marca; las oscuras la llevan a su
     fondo con la letra clara. */
  colores.cortina = deLaCabecera("cortina", "marca");
  colores["sobre-cortina"] = deLaCabecera("sobre-cortina", "sobre-marca");

  return colores;
}

const colores = Object.fromEntries(
  [
    "marca",
    "superficie",
    "texto",
    "accion",
    "exito",
    "alerta",
    "ia-inicio",
    "ia-fin",
    "ia-sobre",
    /* Derivados, y por eso mismo hay que comprobarlos: son el fondo y el texto
       secundario de cada pantalla del panel, y hasta ahora nadie los miraba. */
    "lienzo",
    "texto-suave",
    /* El disco del ícono de un apartado: fondo tenue con texto fuerte. Es una
       pareja de dos colores derivados, o sea de las que nadie miraba. */
    "marca-tenue",
    "marca-fuerte",
    /* El gris de las notas al pie y el fondo que hunde un grupo. Se miran porque
       son justo los que se usan para lo secundario, que es donde el contraste se
       descuida: «total, no es lo importante». */
    "texto-tenue",
    "fondo-hundido",
    /* El aviso: fondo tenue con su propio color de texto encima. Lo usa el
       recuadro de suscripción y el de cambiar precios, o sea los dos lugares
       donde hay que leer antes de tocar. */
    "alerta-tenue",
    /* El verde tenue: la pastilla «Abierto» del buscador y el globo de la
       respuesta del dueño en la portada. */
    "exito-tenue",
    /* El sitio público: la noche con su texto, y el sol con el suyo. */
    "sitio-noche",
    "sitio-sobre-noche",
    "sitio-sol",
    "sitio-sobre-sol",
  ].map((token) => [token, leerColor(token)]),
);

const combinaciones = [
  ["texto", "superficie", 4.5],
  /* El panel dibuja sus títulos directamente sobre el lienzo, no sobre una
     tarjeta. Si esta pareja no se comprueba, el día que alguien oscurezca el
     lienzo un punto «para que se note más» nadie se entera. */
  ["texto", "lienzo", 4.5],
  ["marca", "lienzo", 4.5],
  ["texto-suave", "lienzo", 4.5],
  ["texto-suave", "superficie", 4.5],
  /* Aunque sea el gris de las notas al pie, es texto: al 55 % se quedaba en
     3.55:1 y por eso se definió al 65 %. Sin esta comprobación, alguien lo
     aclara «porque es secundario» y vuelve a reprobar sin que nada avise. */
  ["texto-tenue", "superficie", 4.5],
  /* Lo que se hunde sigue llevando texto encima. */
  ["texto", "fondo-hundido", 4.5],
  ["texto-suave", "fondo-hundido", 4.5],
  ["marca-fuerte", "marca-tenue", 4.5],
  /* La opción elegida del panel se pinta con el fondo de marca y conserva su
     texto normal encima. */
  ["texto", "marca-tenue", 4.5],
  ["texto-suave", "marca-tenue", 4.5],
  ["alerta", "alerta-tenue", 4.5],
  ["texto", "alerta-tenue", 4.5],
  ["texto-suave", "alerta-tenue", 4.5],
  ["marca", "superficie", 4.5],
  /* Los dos extremos del degradado de las herramientas con IA. Se comprueban los
     dos porque el texto va encima de todo el recorrido: alcanza con que un
     extremo falle para que media pastilla no se lea. */
  ["ia-sobre", "ia-inicio", 4.5],
  ["ia-sobre", "ia-fin", 4.5],
  ["accion", "superficie", 4.5],
  ["superficie", "marca", 4.5],
  ["superficie", "accion", 4.5],
  ["superficie", "exito", 4.5],
  ["superficie", "alerta", 4.5],
  /* El sitio público: el texto sobre la noche y sobre el sol, y el sol como
     botón sobre la noche. */
  ["sitio-sobre-noche", "sitio-noche", 4.5],
  ["sitio-sobre-sol", "sitio-sol", 4.5],
  ["sitio-sol", "sitio-noche", 4.5],
  ["texto", "exito-tenue", 4.5],
  ["exito", "exito-tenue", 4.5],
  /* La tarjeta de acrílico, en teal, con su botón claro. */
  ["superficie", "marca-fuerte", 4.5],
  ["marca-fuerte", "superficie", 4.5],
];

const combinacionesFoco = [
  ["texto", "superficie", 3],
  ["superficie", "marca", 3],
  ["superficie", "accion", 3],
  ["superficie", "texto", 3],
];

for (const [frente, fondo, minimo] of combinaciones) {
  const relacion = contraste(colores[frente], colores[fondo]);

  if (relacion < minimo) {
    throw new Error(
      `Contraste insuficiente: ${frente} sobre ${fondo} = ${relacion.toFixed(2)}:1; mínimo ${minimo}:1.`,
    );
  }

  console.log(`${frente} sobre ${fondo}: ${relacion.toFixed(2)}:1`);
}

for (const [frente, fondo, minimo] of combinacionesFoco) {
  const relacion = contraste(colores[frente], colores[fondo]);

  if (relacion < minimo) {
    throw new Error(
      `Foco insuficiente: ${frente} sobre ${fondo} = ${relacion.toFixed(2)}:1; mínimo ${minimo}:1.`,
    );
  }

  console.log(`foco ${frente} sobre ${fondo}: ${relacion.toFixed(2)}:1`);
}

const apariencia = readFileSync(new URL("../lib/apariencia.ts", import.meta.url), "utf8");
const paletas = descubrirPaletas();

/* ── El panel con la paleta del negocio (fase 8.5) ───────────────────────────
 *
 * Hasta acá el control medía **una sola combinación**: la de MiPuesto. Desde que
 * el panel toma el color del negocio en sus acentos, hay diez paneles distintos,
 * y nueve no los miraba nadie.
 *
 * No es una precaución teórica: dos de las diez paletas —«Noche» y «Pizarra»—
 * tienen una marca y una acción pensadas para leerse sobre fondo oscuro. Sobre
 * el lienzo claro del panel esos colores dan dos a uno. Por eso el panel les
 * asigna un tono propio, y por eso eso mismo tiene que estar comprobado: un tono
 * elegido a ojo se ajusta hasta que «se ve bien» y termina reprobando.
 */
/* Qué marca y qué acción usa el panel con cada paleta: la de la paleta, salvo
   que la hoja del panel declare un tono propio para ella. Se lee del CSS y no de
   una lista acá, porque una lista aparte es una copia que se desactualiza. */
function acentosDelPanel(paleta, coloresPaleta) {
  const bloque = cssPaletas.match(
    new RegExp(`\\.tema\\[data-paleta="${paleta}"\\][^{]*\\{([\\s\\S]*?)\\}`),
  )?.[1];

  const propio = (token) =>
    bloque?.match(new RegExp(`--catalogo-${token}-panel:\\s*(#[0-9a-fA-F]{6})\\s*;`))?.[1];

  return {
    marca: propio("marca") ?? coloresPaleta.marca,
    accion: propio("accion") ?? coloresPaleta.accion,
  };
}

/* Las parejas del panel que dependen de la marca o de la acción. Las que no
   —texto sobre superficie, el degradado de la IA— ya se comprobaron arriba y
   no cambian con la paleta: repetirlas diez veces sería ruido. */
const combinacionesDePaleta = combinaciones.filter(([frente, fondo]) =>
  /* `lienzo` entra aunque no lleve «marca» en el nombre: está derivado de ella
     —es un 5 % de la marca sobre la superficie— y por lo tanto cambia con la
     paleta. Dejarlo afuera habría sido comprobar los acentos y no el fondo sobre
     el que se leen, que es donde el contraste se pierde de verdad. */
  [frente, fondo].some((token) => /marca|accion|peligro|fondo-suave|lienzo/.test(token)),
);

for (const paleta of paletas) {
  const acentos = acentosDelPanel(paleta, leerColoresPaleta(paleta));

  for (const [frente, fondo, minimo] of combinacionesDePaleta) {
    const colorFrente = leerColor(frente, new Set(), acentos);
    const colorFondo = leerColor(fondo, new Set(), acentos);
    if (!colorFrente || !colorFondo) continue;

    const relacion = contraste(colorFrente, colorFondo);
    if (relacion < minimo) {
      throw new Error(
        `Panel con la paleta ${paleta}: ${frente} sobre ${fondo} = ${relacion.toFixed(2)}:1; mínimo ${minimo}:1.`,
      );
    }
  }

  /* La acción principal tiene que distinguirse de la segunda, que es la
     superficie con borde. Si una paleta las deja del mismo color, la jerarquía
     de los botones desaparece **en el negocio que eligió esa paleta**, y eso no
     se ve probando con una sola. Tres a uno: es la señal de un elemento gráfico,
     no de un texto. */
  const principal = leerColor("accion", new Set(), acentos);
  const segundo = leerColor("superficie", new Set(), acentos);
  const separacion = contraste(principal, segundo);
  if (separacion < 3) {
    throw new Error(
      `Panel con la paleta ${paleta}: la acción principal no se distingue de la segunda (${separacion.toFixed(2)}:1; mínimo 3:1).`,
    );
  }
}

console.log(`Control de contraste: correcto, con las ${paletas.length} paletas del panel.`);

compararListas("Paletas", paletas, leerListaTs(apariencia, "DEFINICIONES_PALETAS"), "DEFINICIONES_PALETAS");
compararListas("Paletas", paletas, leerConstanteTs(apariencia, "PALETAS"), "la constante PALETAS");
compararListas("Paletas", paletas, leerRestriccionSql("paleta_id"), "la restricción de la base");

console.log(`Registro sincronizado: ${paletas.length} paletas.`);

/* Una paleta se comprueba con su validador, nunca con una comparacion escrita a
   mano. La resolucion de apariencia del catalogo publico se habia quedado en
   cuatro paletas justamente asi: un negocio que elegia Altiplano recibia
   Mercado y nada avisaba. */
function buscarComparacionesALaMano(identificadores) {
  const carpetas = ["app", "lib", "components"];
  const permitidos = [
    "lib/apariencia.ts",
    "lib/plantillas/validacion.ts",
    "components/templates/tema-catalogo.module.css",
  ];
  const hallazgos = [];

  function recorrer(ruta) {
    for (const nombre of readdirSync(ruta)) {
      const completa = join(ruta, nombre);
      if (statSync(completa).isDirectory()) {
        recorrer(completa);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(nombre)) continue;

      const relativa = relative(raizProyecto, completa).replaceAll("\\", "/");
      if (permitidos.includes(relativa)) continue;
      if (relativa.endsWith(".test.ts") || relativa.endsWith(".test.tsx")) continue;

      const contenido = readFileSync(completa, "utf8");
      for (const identificador of identificadores) {
        /* Se exige que lo comparado **se llame** como el eje. Buscar el valor
           suelto encontraba `nombre === "lista"` en el panel de uso de la IA y
           `variante === "catalogo"` en el pie del sitio: ninguno de los dos
           tiene que ver con la apariencia, pero «lista» y «catálogo» son
           palabras corrientes en español.
           Y una guardia a la que hay que irle agregando excepciones termina
           desactivada. Con el nombre de la variable adentro del patrón, lo que
           de verdad busca —`plantilla === "feria"`, `tarjeta === "ficha"`— sigue
           cayendo, y lo demás deja de molestar. */
        const aMano = new RegExp(
          `(plantilla|tarjeta|paleta)[A-Za-z]*\\s*===\\s*"${identificador}"`,
          "i",
        );
        if (aMano.test(contenido)) {
          hallazgos.push(`${relativa}: comparación a mano con "${identificador}"`);
        }
      }
    }
  }

  for (const carpeta of carpetas) recorrer(join(raizProyecto, carpeta));
  return hallazgos;
}

const comparaciones = buscarComparacionesALaMano(paletas);
if (comparaciones.length > 0) {
  throw new Error(
    "Apariencia comparada a mano en vez de con su validador:\n" +
      comparaciones.map((hallazgo) => `- ${hallazgo}`).join("\n"),
  );
}

console.log("Ninguna apariencia se compara a mano.");

for (const paleta of paletas) {
  const coloresPaleta = leerColoresPaleta(paleta);
  const pares = [
    ["texto", "superficie"],
    ["marca", "superficie"],
    ["accion", "superficie"],
    ["sobre-marca", "marca"],
    ["sobre-accion", "accion"],
    ["exito", "superficie"],
    ["alerta", "superficie"],
    /* La cabecera pintada y lo que va encima: el nombre del negocio, «Cómo
       llegar» y «Calificar». */
    ["sobre-navegador", "navegador"],
    /* El texto sobre la cortina de la portada y del banner. */
    ["sobre-cortina", "cortina"],
  ];

  for (const [frente, fondo] of pares) {
    const relacion = contraste(coloresPaleta[frente], coloresPaleta[fondo]);
    if (relacion < 4.5) {
      throw new Error(
        `Contraste insuficiente en ${paleta}: ${frente} sobre ${fondo} = ${relacion.toFixed(2)}:1.`,
      );
    }
  }

  console.log(`Paleta ${paleta}: contraste AA correcto.`);
}
