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

function leerColor(token) {
  const coincidencia = css.match(
    new RegExp(`--color-${token}:\\s*(#[0-9a-fA-F]{6})\\s*;`),
  );

  if (!coincidencia) {
    throw new Error(`No se encontró el token --color-${token}.`);
  }

  return coincidencia[1];
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
    new RegExp(`\\.tema\\[data-paleta="${paleta}"\\]\\s*\\{([\\s\\S]*?)\\}`),
  )?.[1];

  if (!bloque) throw new Error(`No se encontró la paleta ${paleta}.`);

  return Object.fromEntries(
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
}

const colores = Object.fromEntries(
  ["marca", "superficie", "texto", "accion", "exito", "alerta", "ia-inicio", "ia-fin", "ia-sobre"].map(
    (token) => [token, leerColor(token)],
  ),
);

const combinaciones = [
  ["texto", "superficie", 4.5],
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

console.log("Control de contraste: correcto.");

const apariencia = readFileSync(new URL("../lib/apariencia.ts", import.meta.url), "utf8");
const paletas = descubrirPaletas();

compararListas("Paletas", paletas, leerListaTs(apariencia, "DEFINICIONES_PALETAS"), "DEFINICIONES_PALETAS");
compararListas("Paletas", paletas, leerConstanteTs(apariencia, "PALETAS"), "la constante PALETAS");
compararListas("Paletas", paletas, leerRestriccionSql("paleta_id"), "la restricción de la base");

const plantillas = leerListaTs(apariencia, "DEFINICIONES_PLANTILLAS");
compararListas("Plantillas", plantillas, leerConstanteTs(apariencia, "PLANTILLAS"), "la constante PLANTILLAS");
compararListas("Plantillas", plantillas, leerRestriccionSql("plantilla_id"), "la restricción de la base");

console.log(
  `Registro sincronizado: ${plantillas.length} plantillas x ${paletas.length} paletas = ${plantillas.length * paletas.length} combinaciones.`,
);

/* Una plantilla o una paleta se comprueba con su validador, nunca con una
   comparacion escrita a mano. La resolucion de apariencia del catalogo publico
   se habia quedado en tres plantillas y cuatro paletas justamente asi: un
   negocio que elegia Feria recibia Clasica y nada avisaba. */
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
        if (contenido.includes(`=== "${identificador}"`)) {
          hallazgos.push(`${relativa}: === "${identificador}"`);
        }
      }
    }
  }

  for (const carpeta of carpetas) recorrer(join(raizProyecto, carpeta));
  return hallazgos;
}

const comparaciones = buscarComparacionesALaMano([...plantillas, ...paletas]);
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
