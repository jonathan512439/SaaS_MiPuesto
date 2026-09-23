import { NextResponse, type NextRequest } from "next/server";

import { leerSinonimo, normalizarPalabra } from "../../../../lib/directorio-sinonimos";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";

/* Los sinónimos del buscador, desde la plataforma. Fase 12.
 *
 * Con la sesión del administrador: la política de la tabla exige ser
 * administrador de la plataforma **dentro de Postgres**. Si alguien sin permiso
 * llega hasta acá, la base lo frena y esta ruta lo dice.
 */
async function sesion() {
  const supabase = await crearClienteSupabaseServidor();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ? supabase : null;
}

async function leerEntrada(solicitud: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const datos = (await solicitud.json()) as unknown;
    return typeof datos === "object" && datos !== null ? (datos as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function POST(solicitud: NextRequest) {
  const supabase = await sesion();
  if (!supabase) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const entrada = await leerEntrada(solicitud);
  if (!entrada) return NextResponse.json({ error: "Los datos no son válidos." }, { status: 400 });

  const sinonimo = leerSinonimo(entrada.termino, entrada.equivalentes);
  if (!sinonimo.correcto) return NextResponse.json({ error: sinonimo.error }, { status: 400 });

  /* Con `select`: una escritura que la política no deja pasar no da error,
     deja cero filas. Sin mirarlas, esta ruta diría «guardado» a cualquiera. */
  const { data, error } = await supabase
    .from("sinonimos_busqueda")
    .upsert({ termino: sinonimo.termino, equivalentes: sinonimo.equivalentes })
    .select("termino");
  if (error || !data?.length) {
    return NextResponse.json({ error: "No se pudo guardar el sinónimo." }, { status: 403 });
  }

  /* La búsqueda que lo motivó ya está atendida: se saca de la lista, en todas
     las ciudades. Si vuelve a no encontrar nada, vuelve a aparecer sola. Si
     falla, el sinónimo ya quedó guardado y la búsqueda se descarta a mano. */
  await supabase.from("busquedas_sin_resultado").delete().eq("termino", sinonimo.termino);

  return NextResponse.json({ guardado: sinonimo });
}

export async function DELETE(solicitud: NextRequest) {
  const supabase = await sesion();
  if (!supabase) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const entrada = await leerEntrada(solicitud);
  const termino = normalizarPalabra(String(entrada?.termino ?? ""));
  if (!termino) return NextResponse.json({ error: "Falta la palabra." }, { status: 400 });

  const { data, error } = await supabase
    .from("sinonimos_busqueda")
    .delete()
    .eq("termino", termino)
    .select("termino");
  if (error || !data?.length) {
    return NextResponse.json({ error: "No se pudo borrar el sinónimo." }, { status: 403 });
  }
  return NextResponse.json({ borrado: termino });
}
