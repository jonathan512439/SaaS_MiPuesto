/* Prueba las dos cadenas de conexión de `.env.local` antes de copiarlas a los
 * secretos de GitHub.
 *
 *   npm run cadenas:probar
 *
 * El 2026-10-24 el secreto del respaldo quedó con la base de ensayo, y como
 * GitHub no deja ver los valores, se encontró recién tres intentos después.
 * Esto revisa en la máquina, antes de pegar nada: que cada cadena apunte a su
 * proyecto, que use el pooler en modo session (puerto 5432) y que la contraseña
 * entre de verdad.
 *
 * **Nunca muestra la contraseña ni la cadena entera**: solo el proyecto, el
 * puerto y si conectó. Si la conexión falla, el mensaje se imprime con la
 * contraseña tapada.
 */
import { spawn } from "node:child_process";
import { join } from "node:path";

const CLI = join(process.cwd(), "node_modules", "supabase", "dist", "supabase.js");

const CADENAS = [
  { variable: "SUPABASE_DB_URL", que: "producción", proyecto: "afhnxjdqaruwccgsdxzb" },
  { variable: "ENSAYO_DB_URL", que: "ensayo", proyecto: "hwirzxnoyuuqgbwipiff" },
];

function tapar(texto, contrasena) {
  let limpio = texto;
  if (contrasena) limpio = limpio.split(contrasena).join("***");
  return limpio.replace(/postgres(ql)?:\/\/[^\s"']+/g, "postgresql://***");
}

function revisarForma(valor, esperado) {
  const problemas = [];
  let url;
  try {
    url = new URL(valor);
  } catch {
    return { problemas: ["No es una dirección válida. ¿La contraseña tiene @, #, / o espacios? Cámbiala por una de solo letras y números."] };
  }
  if (!/^postgres(ql)?:$/.test(url.protocol)) problemas.push("Tiene que empezar con postgresql://");
  const proyecto = /^postgres\.([a-z0-9]{16,})$/.exec(decodeURIComponent(url.username))?.[1];
  if (!proyecto) {
    problemas.push("El usuario no es «postgres.<proyecto>»: es la cadena directa, no la del pooler. En Supabase elige Connect → Session pooler.");
  } else if (proyecto !== esperado) {
    problemas.push(`Apunta al proyecto ${proyecto}, y tiene que ser ${esperado}.`);
  }
  if (url.port !== "5432") problemas.push(`Usa el puerto ${url.port || "(ninguno)"}: tiene que ser 5432 (Session pooler).`);
  if (!url.hostname.endsWith(".pooler.supabase.com")) problemas.push("El servidor no es el pooler de Supabase (…pooler.supabase.com).");
  if (!url.password) problemas.push("Le falta la contraseña (¿quedó [YOUR-PASSWORD]?).");
  if (url.password.includes("YOUR-PASSWORD")) problemas.push("Todavía dice [YOUR-PASSWORD]: reemplázalo por la contraseña.");
  return { url, proyecto, problemas };
}

function conectar(valor) {
  return new Promise((resolver) => {
    const proceso = spawn(process.execPath, [CLI, "db", "query", "--db-url", valor, "select current_database()"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let salida = "";
    proceso.stdout.on("data", (d) => (salida += d));
    proceso.stderr.on("data", (d) => (salida += d));
    proceso.on("close", (codigo) => resolver({ correcto: codigo === 0, salida }));
  });
}

let todoBien = true;
for (const { variable, que, proyecto } of CADENAS) {
  const valor = process.env[variable];
  console.log(`\n${variable} (${que})`);
  if (!valor) {
    console.log(`  ✗ No está en .env.local. Agrega la línea ${variable}=… con la cadena del Session pooler.`);
    todoBien = false;
    continue;
  }
  const { url, problemas } = revisarForma(valor, proyecto);
  if (problemas.length > 0) {
    for (const problema of problemas) console.log(`  ✗ ${problema}`);
    todoBien = false;
    continue;
  }
  console.log(`  ✓ Proyecto ${proyecto}, puerto 5432, pooler en modo session.`);
  const { correcto, salida } = await conectar(valor);
  if (correcto) {
    console.log("  ✓ Conectó con la contraseña.");
  } else {
    todoBien = false;
    const contrasena = decodeURIComponent(url.password);
    const motivo = tapar(salida, contrasena).split("\n").filter((l) => /error|failed|denied|password|timeout/i.test(l)).slice(0, 3);
    console.log("  ✗ No conectó.");
    for (const linea of motivo) console.log(`    ${linea.trim()}`);
    if (/password authentication failed/i.test(salida)) {
      console.log("    → La contraseña no es la actual. Restablécela en Supabase y vuelve a pegarla.");
    }
  }
}

console.log(
  todoBien
    ? "\nLas dos están bien. Ahora copia cada una a su secreto de GitHub, tal cual está en .env.local."
    : "\nCorrige lo marcado con ✗ y vuelve a correr: npm run cadenas:probar",
);
process.exit(todoBien ? 0 : 1);
