import { createClient } from "@supabase/supabase-js";

import { obtenerClaveServicioLocal } from "./servicio-supabase-local.mjs";

const correo = process.argv[2]?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const sitio = process.env.NEXT_PUBLIC_SITE_URL;

if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
  throw new Error("Uso: npm run auth:invitar -- correo@negocio.com");
}

if (!url || !sitio) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SITE_URL.");
}

const destino = new URL("/actualizar-clave", sitio).toString();
const claveServicio = await obtenerClaveServicioLocal();
const supabase = createClient(url, claveServicio, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { error } = await supabase.auth.admin.inviteUserByEmail(correo, {
  redirectTo: destino,
});

if (error) {
  throw new Error(`No se pudo enviar la invitación: ${error.message}`);
}

console.log("Invitación enviada. La persona podrá definir su contraseña desde el enlace.");
