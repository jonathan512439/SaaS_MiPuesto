import { validarEventoAnalitica } from "../../../lib/analitica";
import { crearHuellaIp, leerSecretoHuella, obtenerIpSolicitud } from "../../../lib/huella-ip";
import { crearClienteSupabaseAdmin } from "../../../lib/supabase/admin";

const RESPUESTA_VACIA = { status: 204, headers: { "Cache-Control": "no-store" } } as const;

/* Antes esto escribía con la clave pública y el único tope era de sesenta
 * eventos por hora **por sesión** —y la sesión la elige el navegador—, así que
 * un bucle rotando UUID escribía filas sin fin. Se comprobó contra producción
 * antes de cambiarlo.
 *
 * Ahora cuenta por huella de IP, igual que los pedidos. La huella solo sirve si
 * el cliente no puede elegirla, y por eso el registro dejó de estar abierto a
 * `anon`: pasa por una función que solo puede llamar el servidor, que es el
 * único que ve la IP de verdad.
 *
 * Nada de esto cambia lo que devuelve. La analítica es lo último que debe
 * fallar ruidosamente: si no se puede registrar, la página del comprador no se
 * entera.
 */
export async function POST(solicitud: Request) {
  if (Number(solicitud.headers.get("content-length") ?? 0) > 1024) {
    return Response.json({ error: "Solicitud inválida." }, { status: 413 });
  }

  const contenido = await solicitud.json().catch(() => null);
  const evento = validarEventoAnalitica(contenido);
  if (!evento) return Response.json({ error: "Evento inválido." }, { status: 400 });

  try {
    const supabase = crearClienteSupabaseAdmin();
    const huellaIp = await crearHuellaIp(obtenerIpSolicitud(solicitud), leerSecretoHuella());

    await supabase.rpc("registrar_evento_analitica", {
      p_negocio_id: evento.negocioId,
      p_sesion_id: evento.sesionId,
      p_tipo: evento.tipo,
      p_producto_id: evento.productoId as string,
      p_huella_ip: huellaIp,
    });
  } catch {
    /* Sin clave configurada, o con la base caída, no se mide y ya está. */
  }

  return new Response(null, RESPUESTA_VACIA);
}
