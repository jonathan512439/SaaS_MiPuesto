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
/* Se arman por partes para que el propio guardián no contenga el nombre
   completo y se denuncie a sí mismo.

   La clave de Gemini entra en la misma lista y no en una regla aparte: el plan
   dice tratarla igual que la de Supabase, y una segunda regla parecida es una
   que alguien va a olvidar de actualizar. */
const clavesPrivilegiadas = [
  "SUPABASE_" + "SERVICE_ROLE_KEY",
  "GEMINI_" + "API_KEY",
];
const clavesPublicasProhibidas = clavesPrivilegiadas.map(
  (clave) => "NEXT_PUBLIC_" + clave,
);
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

    for (const prohibida of clavesPublicasProhibidas) {
      if (contenido.includes(prohibida)) {
        infracciones.push(`${relative(raiz, ruta)} usa ${prohibida}`);
      }
    }

    if (esCliente) {
      for (const clave of clavesPrivilegiadas) {
        if (contenido.includes(clave)) {
          infracciones.push(
            `${relative(raiz, ruta)} referencia ${clave} desde código cliente`,
          );
        }
      }
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

for (const clave of clavesPrivilegiadas) {
  const secretoLocal = await leerVariableLocal(clave);
  /* Si la variable no está configurada no hay nada que buscar, y buscar una
     cadena corta daría falsos positivos en cualquier bundle. */
  if (secretoLocal.length >= 20) {
    await Promise.all(
      directoriosClienteCompilado.map((ruta) =>
        buscarSecretoCompilado(ruta, secretoLocal),
      ),
    );
  }
}

if (infracciones.length > 0) {
  console.error("Control de secretos fallido:\n" + infracciones.join("\n"));
  process.exit(1);
}

console.log("Control de secretos de cliente: correcto.");
