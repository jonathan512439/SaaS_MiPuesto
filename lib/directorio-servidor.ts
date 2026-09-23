import { crearClienteSupabaseAdmin } from "./supabase/admin";

/* Anotar que una búsqueda no encontró nada. Fase 12.
 *
 * Solo el término ya normalizado y la ciudad, con un contador: nada de quién
 * buscó. Es el dato para saber qué sinónimo falta o qué rubro no tiene
 * negocios todavía.
 *
 * Lo anota el servidor con su clave —la función no la puede llamar el
 * navegador— y **nunca rompe la página**: si falla, el cliente igual ve su
 * pantalla sin resultados, que es lo que importa.
 */
export async function registrarBusquedaSinResultado(palabras: string[], ciudad: string | null) {
  const termino = palabras.join(" ").slice(0, 60);
  if (termino.length < 2) return;
  try {
    const admin = crearClienteSupabaseAdmin();
    await admin.rpc("registrar_busqueda_sin_resultado", {
      p_termino: termino,
      p_ciudad: ciudad ?? "",
    });
  } catch {
    // Anotarlo es un extra: no se le cobra al visitante con un error.
  }
}
