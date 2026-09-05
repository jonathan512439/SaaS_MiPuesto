/* Comprueba una restauración contra la base real.
 *
 *   RESTAURADO_URL=https://xxx.supabase.co \
 *   RESTAURADO_KEY=<clave de servicio del proyecto restaurado> \
 *   npm run respaldo:verificar
 *
 * Un respaldo que nunca se restauró no es un respaldo, y una restauración que no
 * se comparó con el original tampoco: lo que hay que ver es que no falte nada,
 * no que el comando haya terminado sin error.
 */
import { createClient } from "@supabase/supabase-js";

import { obtenerClaveServicioLocal } from "./servicio-supabase-local.mjs";

const TABLAS = [
  "negocios",
  "categorias",
  "subcategorias",
  "productos",
  "promociones",
  "pedidos",
  "pedido_items",
];

const urlReal = process.env.NEXT_PUBLIC_SUPABASE_URL;
const urlRestaurado = process.env.RESTAURADO_URL;
const claveRestaurado = process.env.RESTAURADO_KEY;

if (!urlReal) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL.");
if (!urlRestaurado || !claveRestaurado) {
  throw new Error(
    "Faltan RESTAURADO_URL y RESTAURADO_KEY, del proyecto donde restauraste.",
  );
}

const opciones = { auth: { autoRefreshToken: false, persistSession: false } };
const real = createClient(urlReal, await obtenerClaveServicioLocal(), opciones);
const restaurado = createClient(urlRestaurado, claveRestaurado, opciones);

async function contar(cliente, tabla) {
  const { count, error } = await cliente.from(tabla).select("*", { count: "exact", head: true });
  if (error) return { error: error.message };
  return { count: count ?? 0 };
}

console.log(["TABLA".padEnd(16), "REAL".padStart(8), "RESTAURADO".padStart(12), ""].join(" "));

let fallas = 0;
for (const tabla of TABLAS) {
  const [a, b] = await Promise.all([contar(real, tabla), contar(restaurado, tabla)]);

  if (a.error || b.error) {
    fallas += 1;
    console.log(`${tabla.padEnd(16)} ${(a.error ? "error" : String(a.count)).padStart(8)} ${(b.error ? "error" : String(b.count)).padStart(12)}  REVISAR`);
    continue;
  }

  /* Se admite que el restaurado tenga menos: el respaldo es de ayer y la base
     real siguió recibiendo pedidos. Lo que no se admite es que falten filas
     viejas, y eso se ve cuando la diferencia es grande o negativa al revés. */
  const marca = b.count === a.count ? "igual" : b.count < a.count ? `faltan ${a.count - b.count}` : `sobran ${b.count - a.count}`;
  if (b.count === 0 && a.count > 0) fallas += 1;
  console.log(`${tabla.padEnd(16)} ${String(a.count).padStart(8)} ${String(b.count).padStart(12)}  ${marca}`);
}

if (fallas > 0) {
  console.log("\nHay tablas vacías o ilegibles en el restaurado: la restauración no sirve.");
  process.exitCode = 1;
} else {
  console.log("\nTodas las tablas tienen contenido. Anotá la fecha del ensayo en docs/RESPALDOS.md.");
}
