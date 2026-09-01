import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const raiz = process.cwd();
const directoriosCodigo = ["app", "components", "lib"].map((ruta) =>
  join(raiz, ruta),
);
const directoriosClienteCompilado = [
  join(raiz, "dist", "client"),
  join(raiz, ".next", "static"),
];
const extensiones = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const extensionesCompiladas = new Set([".css", ".html", ".js", ".json"]);
const clavePrivilegiada = "SUPABASE_" + "SERVICE_ROLE_KEY";
const clavePublicaProhibida = "NEXT_PUBLIC_" + clavePrivilegiada;
const infracciones = [];

async function leerVariableLocal(nombre) {
  try {
    const contenido = await readFile(join(raiz, ".env.local"), "utf8");
    const prefijo = `${nombre}=`;
    const linea = contenido
      .split(/\r?\n/)
      .find((entrada) => entrada.startsWith(prefijo));

    if (!linea) return "";

    const valor = linea.slice(prefijo.length).trim();
    const estaEntreComillas =
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"));

    return estaEntreComillas ? valor.slice(1, -1) : valor;
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
}

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

async function buscarSecretoCompilado(ruta, secreto) {
  try {
    const datos = await stat(ruta);

    if (datos.isDirectory()) {
      const entradas = await readdir(ruta);
      await Promise.all(
        entradas.map((entrada) =>
          buscarSecretoCompilado(join(ruta, entrada), secreto),
        ),
      );
      return;
    }

    if (!extensionesCompiladas.has(extname(ruta))) return;

    const contenido = await readFile(ruta, "utf8");
    if (contenido.includes(secreto)) {
      infracciones.push(
        `${relative(raiz, ruta)} contiene una clave privilegiada en el bundle cliente`,
      );
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

await Promise.all(directoriosCodigo.map(recorrer));

const secretoLocal = await leerVariableLocal(clavePrivilegiada);
if (secretoLocal.length >= 20) {
  await Promise.all(
    directoriosClienteCompilado.map((ruta) =>
      buscarSecretoCompilado(ruta, secretoLocal),
    ),
  );
}

if (infracciones.length > 0) {
  console.error("Control de secretos fallido:\n" + infracciones.join("\n"));
  process.exit(1);
}

console.log("Control de secretos de cliente: correcto.");
