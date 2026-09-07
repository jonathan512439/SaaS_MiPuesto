import { obtenerClaveServicioLocal } from "./servicio-supabase-local.mjs";

/* Genera un enlace para definir la contraseña sin pasar por el correo.
 *
 * Existe porque el correo es la parte más frágil del sistema y no depende de
 * nosotros: si el servidor de envío falla, si la plantilla queda mal, o si el
 * mensaje cae en spam, el dueño de un negocio se queda afuera de su propio
 * panel y no hay nada que pueda hacer solo.
 *
 * El enlace se imprime acá, en la terminal de quien administra la plataforma, y
 * se le pasa a la persona por el medio que se prefiera. No se manda por correo
 * ni queda escrito en ningún archivo del repositorio.
 *
 * **Cuidado: quien tenga este enlace puede definir la contraseña de esa cuenta.**
 * Vale lo mismo que el correo. No se comparte en un grupo ni se deja pegado.
 */
const correo = process.argv[2];

if (!correo || !correo.includes("@")) {
  throw new Error("Uso: npm run auth:enlace -- correo@ejemplo.com");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en .env.local.");

const sitio = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const clave = await obtenerClaveServicioLocal();

const respuesta = await fetch(`${url}/auth/v1/admin/generate_link`, {
  body: JSON.stringify({ type: "recovery", email: correo }),
  headers: { apikey: clave, authorization: `Bearer ${clave}`, "content-type": "application/json" },
  method: "POST",
});

const datos = await respuesta.json();
if (!respuesta.ok) {
  throw new Error(`Supabase respondió ${respuesta.status}: ${JSON.stringify(datos).slice(0, 200)}`);
}

const hash = datos.hashed_token ?? datos.properties?.hashed_token;
if (!hash) throw new Error("Supabase no devolvió el token del enlace.");

/* Se arma con la misma forma que la plantilla del correo: la que no se consume
   al abrirse, sino al tocar el botón de guardar. */
const base = sitio || new URL(datos.action_link ?? datos.properties.action_link).searchParams.get("redirect_to");
console.log("");
console.log(`Enlace para ${correo} — sirve una sola vez y vence en una hora:`);
console.log("");
console.log(`${new URL("/actualizar-clave", base).toString()}?token_hash=${hash}&type=recovery`);
console.log("");
console.log("Generarlo invalida cualquier enlace anterior de esa cuenta.");
