/* El registro de usuarios tiene que estar cerrado: a MiPuesto se entra por
 * invitación.
 *
 *   npm run test:registro:linked
 *
 * Encontrado en la auditoría del 2026-11-15. `docs/CONFIGURACION-MANUAL.md`
 * dice «Allow new users to sign up: desactivado», pero Supabase Auth en
 * producción respondía `disable_signup: false`: con la clave pública —que va en
 * cada página— cualquiera podía crearse una cuenta, y con una cuenta, dar de
 * alta un catálogo. Nadie lo había notado porque la aplicación no tiene
 * pantalla de registro; la API sí.
 *
 * Es un interruptor de la consola de Supabase, no del repositorio: se puede
 * volver a prender sin que cambie una línea de código. Por eso se mira acá, con
 * la misma clave pública que usaría quien quisiera aprovecharlo, y corre con
 * `npm run test:rls:linked` al cierre de cada fase.
 *
 * Solo lee: `GET /auth/v1/settings` es la configuración que Supabase publica.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clavePublica =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !clavePublica) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y la clave pública. Corre con --env-file-if-exists=.env.local.");
  process.exit(1);
}

const respuesta = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
  headers: { apikey: clavePublica.trim() },
});
if (!respuesta.ok) {
  console.error(`No se pudo leer la configuración de Auth (${respuesta.status}).`);
  process.exit(1);
}
const configuracion = await respuesta.json();

const problemas = [];
if (configuracion.disable_signup !== true) {
  problemas.push(
    "El registro está ABIERTO: cualquiera con la clave pública puede crearse una cuenta.\n" +
      "    Supabase → Authentication → Sign In / Providers → «Allow new users to sign up»: apagar.\n" +
      "    Las invitaciones siguen funcionando con el registro apagado.",
  );
}
if (configuracion.external?.anonymous_users === true) {
  problemas.push(
    "El ingreso anónimo está prendido: da una sesión a cualquiera, sin correo.\n" +
      "    Supabase → Authentication → Sign In / Providers → «Allow anonymous sign-ins»: apagar.",
  );
}
if (configuracion.mailer_autoconfirm === true) {
  problemas.push(
    "Los correos se dan por confirmados solos.\n" +
      "    Supabase → Authentication → Sign In / Providers → Email → «Confirm email»: prender.",
  );
}
const otros = Object.entries(configuracion.external ?? {})
  .filter(([nombre, activo]) => activo === true && nombre !== "email")
  .map(([nombre]) => nombre);
if (otros.length > 0) {
  problemas.push(`Hay formas de ingreso que la aplicación no usa: ${otros.join(", ")}. Apágalas.`);
}

if (problemas.length > 0) {
  console.error(`\nSupabase Auth (${new URL(url).hostname}):`);
  for (const problema of problemas) console.error(`  - ${problema}`);
  console.error("");
  process.exit(1);
}

console.log("Registro cerrado: solo se entra por invitación, con correo y contraseña.");
