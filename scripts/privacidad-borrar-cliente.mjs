/* «Borren mis datos»: lo que se corre cuando un cliente final lo pide.
 *
 * Un cliente final no tiene cuenta: pidió por WhatsApp en uno o varios
 * negocios. Lo que lo identifica es su teléfono, y con él se borran su nombre,
 * su teléfono y las notas que escribió, en todos los negocios, sin tocar los
 * pedidos ni las citas (el negocio conserva qué vendió y cuándo).
 *
 * Primero muestra qué encontró y no borra nada. Borra recién con --confirmar:
 * no se puede deshacer, y el número lo escribe una persona.
 *
 *   npm run privacidad:borrar-cliente -- 70012345
 *   npm run privacidad:borrar-cliente -- 70012345 --confirmar
 *
 * La clave privilegiada se pide a la sesión local del CLI, como en
 * `suscripciones.mjs`: nunca llega a producción.
 */
import { createClient } from "@supabase/supabase-js";

import { obtenerClaveServicioLocal } from "./servicio-supabase-local.mjs";

const argumentos = process.argv.slice(2);
const confirmar = argumentos.includes("--confirmar");
const escrito = argumentos.find((argumento) => !argumento.startsWith("--")) ?? "";

/* Se acepta como lo dicta la gente —«700 12 345», «+591 70012345»— y se lleva
   a la forma en que se guarda: 591 y los ocho dígitos. */
const digitos = escrito.replace(/\D/g, "");
const telefono = digitos.length === 8 ? `591${digitos}` : digitos;

if (!/^591[67][0-9]{7}$/.test(telefono)) {
  console.error(
    "Escribe el celular del cliente: ocho dígitos que empiezan con 6 o 7, con o sin 591.\n" +
      "  npm run privacidad:borrar-cliente -- 70012345 [--confirmar]",
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL.");

const supabase = createClient(url, await obtenerClaveServicioLocal(), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const [pedidos, citas] = await Promise.all([
  supabase
    .from("pedidos")
    .select("codigo,creado_en,negocios(nombre)")
    .eq("cliente_telefono", telefono)
    .order("creado_en", { ascending: false }),
  supabase
    .from("citas")
    .select("codigo,creado_en,negocios(nombre)")
    .eq("telefono_cliente", telefono)
    .order("creado_en", { ascending: false }),
]);
if (pedidos.error || citas.error) {
  throw new Error(`No se pudo buscar: ${(pedidos.error ?? citas.error).message}`);
}

const fecha = new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", dateStyle: "medium" });
const lineas = [
  ...(pedidos.data ?? []).map((fila) => `  pedido ${fila.codigo} · ${fila.negocios?.nombre ?? "?"} · ${fecha.format(new Date(fila.creado_en))}`),
  ...(citas.data ?? []).map((fila) => `  cita ${fila.codigo} · ${fila.negocios?.nombre ?? "?"} · ${fecha.format(new Date(fila.creado_en))}`),
];

if (lineas.length === 0) {
  console.log(`No hay pedidos ni citas con el ${telefono}. No hay nada que borrar.`);
  process.exit(0);
}

console.log(`Con el ${telefono} hay ${pedidos.data.length} pedido(s) y ${citas.data.length} cita(s):`);
console.log(lineas.join("\n"));

if (!confirmar) {
  console.log("\nNo se borró nada. Para borrar el nombre, el teléfono y las notas, agrega --confirmar.");
  process.exit(0);
}

const { data, error } = await supabase.rpc("borrar_datos_de_un_cliente", { p_telefono: telefono });
if (error) throw new Error(`No se pudo borrar: ${error.message}`);
const [resultado] = data ?? [];
console.log(
  `\nBorrado: ${resultado?.pedidos ?? 0} pedido(s) y ${resultado?.citas ?? 0} cita(s) quedaron sin nombre, teléfono ni notas del cliente.`,
);
