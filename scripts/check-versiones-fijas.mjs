/* Todas las dependencias con versión exacta, y el candado de acuerdo.
 *
 * El sistema corre sobre vinext, que está en beta: una versión nueva puede
 * cambiar cómo se arma una página sin avisar —pasó con `next/image`—. Un «^» en
 * `package.json` deja que la próxima instalación traiga una versión que nadie
 * probó, y en Cloudflare la instalación se hace en cada publicación.
 *
 * Por eso se comprueban dos cosas:
 *
 * 1. Ninguna dependencia usa un rango (`^`, `~`, `*`, `>=`, `latest`, `x`).
 * 2. `package-lock.json` pide exactamente lo mismo que `package.json`. Un
 *    candado desactualizado hace que `npm ci` falle en Cloudflare, y es mejor
 *    enterarse acá que con una publicación trabada.
 *
 * `.npmrc` ya tiene `save-exact=true`, así que `npm install paquete` escribe la
 * versión exacta. Esto es para lo que se edita a mano.
 *
 * Cómo se actualiza vinext sin sorpresas: `docs/ACTUALIZAR-DEPENDENCIAS.md`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const paquete = JSON.parse(readFileSync(`${raiz}package.json`, "utf8"));
const candado = JSON.parse(readFileSync(`${raiz}package-lock.json`, "utf8"));

const EXACTA = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const problemas = [];

for (const grupo of ["dependencies", "devDependencies", "optionalDependencies"]) {
  const declaradas = paquete[grupo] ?? {};
  const enCandado = candado.packages?.[""]?.[grupo] ?? {};

  for (const [nombre, version] of Object.entries(declaradas)) {
    if (!EXACTA.test(version)) {
      problemas.push(`${nombre}: «${version}» no es una versión exacta (${grupo}).`);
    }
    if (enCandado[nombre] !== version) {
      problemas.push(
        `${nombre}: package.json pide ${version} y package-lock.json ${enCandado[nombre] ?? "no lo tiene"}. Corre npm install.`,
      );
    }
    const instalada = candado.packages?.[`node_modules/${nombre}`]?.version;
    if (EXACTA.test(version) && instalada !== version) {
      problemas.push(`${nombre}: el candado resolvió ${instalada ?? "nada"} en vez de ${version}.`);
    }
  }

  for (const nombre of Object.keys(enCandado)) {
    if (!(nombre in declaradas)) {
      problemas.push(`${nombre}: está en package-lock.json pero no en package.json (${grupo}).`);
    }
  }
}

if (problemas.length > 0) {
  console.error("Versiones de dependencias: hay que corregir esto.\n");
  for (const problema of problemas) console.error(`- ${problema}`);
  process.exit(1);
}

console.log("Versiones de dependencias: todas exactas y de acuerdo con el candado.");
