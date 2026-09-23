import { NextResponse, type NextRequest } from "next/server";

import { normalizarPalabra } from "../../../../lib/directorio-sinonimos";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";

/* Descartar una búsqueda sin resultado ya atendida. Fase 12.
 *
 * Con la sesión del administrador: la política de la tabla exige ser
 * administrador de la plataforma dentro de Postgres. La ciudad vacía es «sin
 * ciudad», que es una fila más, no «todas».
 */
export async function DELETE(solicitud: NextRequest) {
  const supabase = await crearClienteSupabaseServidor();
  const { data: sesion } = await supabase.auth.getClaims();
  if (!sesion?.claims.sub) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  let entrada: Record<string, unknown> = {};
  try {
    entrada = ((await solicitud.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Los datos no son válidos." }, { status: 400 });
  }
  const termino = typeof entrada.termino === "string" ? entrada.termino : "";
  const ciudad = typeof entrada.ciudad === "string" ? entrada.ciudad : "";
  if (!normalizarPalabra(termino)) return NextResponse.json({ error: "Falta la búsqueda." }, { status: 400 });

  /* Con `select`: un borrado que la política no deja pasar no da error, deja
     cero filas. */
  const { data, error } = await supabase
    .from("busquedas_sin_resultado")
    .delete()
    .eq("termino", termino)
    .eq("ciudad", ciudad)
    .select("termino");
  if (error || !data?.length) {
    return NextResponse.json({ error: "No se pudo descartar." }, { status: 403 });
  }
  return NextResponse.json({ descartada: true });
}
