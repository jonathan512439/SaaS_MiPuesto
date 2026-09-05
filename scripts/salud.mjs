/* Detalle de la vigilancia, para cuando /api/salud dice que algo va mal.
 *
 *   npm run salud
 *
 * Corre con la clave privilegiada de la sesión local del CLI, igual que el
 * script de suscripciones: el endpoint público responde en grueso a propósito y
 * el detalle no tiene por qué estar abierto.
 */
import { createClient } from "@supabase/supabase-js";

import { obtenerClaveServicioLocal } from "./servicio-supabase-local.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL.");

const supabase = createClient(url, await obtenerClaveServicioLocal(), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.rpc("estado_tareas");
if (error) throw new Error(`No se pudo leer la vigilancia: ${error.message}`);

const formato = new Intl.DateTimeFormat("es-BO", {
  timeZone: "America/La_Paz",
  dateStyle: "short",
  timeStyle: "short",
});

console.log(["ESTADO".padEnd(12), "TAREA".padEnd(30), "ÚLTIMA CORRIDA"].join(" "));
for (const tarea of data) {
  const estado = tarea.atrasada
    ? "ATRASADA"
    : tarea.nunca_corrio
      ? "sin correr"
      : "al día";
  const cuando = tarea.ultima_corrida
    ? `${formato.format(new Date(tarea.ultima_corrida))} (hace ${tarea.minutos_desde} min)`
    : "todavía no corrió";
  console.log([estado.padEnd(12), tarea.tarea.padEnd(30), cuando].join(" "));
}

if (data.some((tarea) => tarea.atrasada)) {
  console.log("\nHay tareas atrasadas. Revisá cron.job en la consola de Supabase.");
  process.exitCode = 1;
}
