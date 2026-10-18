import type { NextRequest } from "next/server";

import { entregarArchivo } from "../../../../lib/tutoriales/archivos";
import { baldeTutoriales } from "../../../../lib/tutoriales/balde";

export const dynamic = "force-dynamic";

/* El video y la portada de un tutorial, desde R2.
 *
 * Es pública y sin sesión, y a propósito: los tutoriales enseñan a usar el
 * panel, no guardan nada de nadie, y pedir sesión en cada parte del video
 * sumaría una consulta a la base por cada trozo que pide el reproductor. Lo que
 * no está publicado no se lista en ningún lado, y su nombre lleva 32 cifras al
 * azar: no se adivina.
 *
 * Cuando haya dominio, el balde se puede servir directo desde
 * `videos.mi-puesto.com` y esta ruta queda para las copias sin dominio.
 */
async function responder(solicitud: NextRequest, { params }: { params: Promise<{ nombre: string }> }) {
  const balde = baldeTutoriales();
  if (!balde) return new Response("No existe.", { status: 404, headers: { "Cache-Control": "no-store" } });
  return entregarArchivo(balde, (await params).nombre, solicitud);
}

export { responder as GET, responder as HEAD };
