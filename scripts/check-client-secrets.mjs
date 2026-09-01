import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const raiz = process.cwd();
const directoriosCodigo = ["app", "components", "lib"].map((ruta) =>
  join(raiz, ruta),
);
const extensiones = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const clavePrivilegiada = "SUPABASE_" + "SERVICE_ROLE_KEY";
const clavePublicaProhibida = "NEXT_PUBLIC_" + clavePrivilegiada;
const infracciones = [];

async function recorrer(ruta) {
  try {
    const datos = await stat(ruta);

    if (datos.isDirectory()) {
      const entradas = await readdir(ruta);
      await Promise.all(entradas.map((entrada) => recorrer(join(ruta, entrada))));
      return;
    }

    if (!extensiones.has(extname(ruta))) return;

    const contenido = await readFile(ruta, "utf8");
    const esCliente = /^\s*["']use client["'];?/m.test(contenido);

    if (contenido.includes(clavePublicaProhibida)) {
      infracciones.push(`${relative(raiz, ruta)} usa ${clavePublicaProhibida}`);
    }

    if (esCliente && contenido.includes(clavePrivilegiada)) {
      infracciones.push(
        `${relative(raiz, ruta)} referencia una clave privilegiada desde código cliente`,
      );
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

await Promise.all(directoriosCodigo.map(recorrer));

if (infracciones.length > 0) {
  console.error("Control de secretos fallido:\n" + infracciones.join("\n"));
  process.exit(1);
}

console.log("Control de secretos de cliente: correcto.");
