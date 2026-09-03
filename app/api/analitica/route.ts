import { validarEventoAnalitica } from "../../../lib/analitica";
import { crearClienteSupabasePublico } from "../../../lib/supabase/public";

const RESPUESTA_VACIA = { status: 204, headers: { "Cache-Control": "no-store" } } as const;

export async function POST(solicitud: Request) {
  if (Number(solicitud.headers.get("content-length") ?? 0) > 1024) {
    return Response.json({ error: "Solicitud inválida." }, { status: 413 });
  }

  const contenido = await solicitud.json().catch(() => null);
  const evento = validarEventoAnalitica(contenido);
  if (!evento) return Response.json({ error: "Evento inválido." }, { status: 400 });

  const supabase = crearClienteSupabasePublico();
  const { error } = await supabase.from("eventos_analitica").insert({
    negocio_id: evento.negocioId,
    producto_id: evento.productoId,
    sesion_id: evento.sesionId,
    tipo: evento.tipo,
  });

  if (error && error.code !== "23505" && error.code !== "P0001" && error.code !== "42501") {
    console.error("No se pudo registrar el evento de analítica.", error.code);
  }

  return new Response(null, RESPUESTA_VACIA);
}
