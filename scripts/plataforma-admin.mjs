/* Alta y baja de administradores de la plataforma.
 *
 *   npm run plataforma:admin -- ver
 *   npm run plataforma:admin -- agregar correo@ejemplo.com
 *   npm run plataforma:admin -- quitar correo@ejemplo.com
 *
 * Sigue siendo un acto deliberado con la clave privilegiada, igual que hacerlo
 * en la consola: lo que no existe, y no va a existir, es darse este permiso
 * desde el panel.
 */
import { createClient } from "@supabase/supabase-js";

import { obtenerClaveServicioLocal } from "./servicio-supabase-local.mjs";

const [accion, correoCrudo] = process.argv.slice(2);
const correo = correoCrudo?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL.");
if (!["ver", "agregar", "quitar"].includes(accion)) {
  throw new Error(
    "Uso: npm run plataforma:admin -- ver | agregar <correo> | quitar <correo>",
  );
}
if (accion !== "ver" && !correo) {
  throw new Error(`Falta el correo: npm run plataforma:admin -- ${accion} <correo>`);
}

const supabase = createClient(url, await obtenerClaveServicioLocal(), {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function buscarUsuario(correoBuscado) {
  /* La API de administración pagina; con pocos usuarios alcanza la primera
     página, y si algún día no alcanza este bucle lo resuelve sin cambiar nada. */
  for (let pagina = 1; pagina <= 20; pagina += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: 100 });
    if (error) throw new Error(`No se pudo listar usuarios: ${error.message}`);
    const encontrado = data.users.find((u) => u.email?.toLowerCase() === correoBuscado);
    if (encontrado) return encontrado;
    if (data.users.length < 100) return null;
  }
  return null;
}

async function ver() {
  const { data, error } = await supabase.from("plataforma_admins").select("user_id,nota,creado_en");
  if (error) throw new Error(`No se pudo leer: ${error.message}`);
  if (data.length === 0) {
    console.log("No hay administradores de plataforma. El panel está inerte.");
    return;
  }
  const { data: usuarios } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
  const correoPorId = new Map((usuarios?.users ?? []).map((u) => [u.id, u.email]));
  for (const fila of data) {
    console.log(`${correoPorId.get(fila.user_id) ?? fila.user_id}  ${fila.nota ?? ""}`);
  }
}

async function agregar() {
  const usuario = await buscarUsuario(correo);
  if (!usuario) throw new Error(`No existe una cuenta con el correo “${correo}”.`);

  const { error } = await supabase
    .from("plataforma_admins")
    .upsert({ user_id: usuario.id, nota: "alta desde la máquina de operación" });
  if (error) throw new Error(`No se pudo dar de alta: ${error.message}`);

  console.log(`${correo} administra la plataforma.`);
  console.log("Al entrar a /plataforma se le va a pedir inscribir el segundo factor.");
}

async function quitar() {
  const usuario = await buscarUsuario(correo);
  if (!usuario) throw new Error(`No existe una cuenta con el correo “${correo}”.`);

  const { error } = await supabase
    .from("plataforma_admins")
    .delete()
    .eq("user_id", usuario.id);
  if (error) throw new Error(`No se pudo quitar: ${error.message}`);
  console.log(`${correo} ya no administra la plataforma.`);
}

if (accion === "ver") await ver();
else if (accion === "agregar") await agregar();
else await quitar();
