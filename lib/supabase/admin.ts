import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { obtenerVariablesPublicasSupabase } from "./variables";

type ClienteAdmin = ReturnType<typeof createClient<Database>>;

/* El cliente se arma una vez por isolate y se reusa.
 *
 * Armarlo cuesta medio milisegundo de CPU en caliente y varios en frío, y
 * Cloudflare en el plan gratuito da diez por solicitud: el pedido lo pagaba
 * entero en cada compra. Reusarlo es seguro porque este cliente **no guarda
 * nada de nadie**: sin sesión, sin refresco de token, sin escuchar la URL. Es
 * la dirección, la clave y un `fetch` que se hace de nuevo en cada consulta.
 *
 * Se guarda con la dirección y la clave de las que salió: si alguna cambia
 * —una clave rotada, una prueba que cambia el entorno—, se arma otro. */
let clienteGuardado: { llave: string; cliente: ClienteAdmin } | null = null;

export function crearClienteSupabaseAdmin(): ClienteAdmin {
  const { url } = obtenerVariablesPublicasSupabase();
  const claveServicio =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!claveServicio) {
    throw new Error("Falta la clave privada de Supabase en el entorno del servidor.");
  }

  const llave = `${url} ${claveServicio}`;
  if (clienteGuardado?.llave !== llave) {
    clienteGuardado = {
      llave,
      cliente: createClient<Database>(url, claveServicio, {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      }),
    };
  }
  return clienteGuardado.cliente;
}
