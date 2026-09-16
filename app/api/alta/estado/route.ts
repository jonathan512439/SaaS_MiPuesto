import { NextResponse } from "next/server";

import { estadoDeAlta } from "../../../../lib/negocios/alta";
import { leerSituacionDelNegocio } from "../../../../lib/negocios/situacion";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";

/* En qué paso del alta está el negocio, y qué le falta para publicar.
 *
 * Lo consulta el panel para decidir a dónde mandar al dueño al entrar. La
 * pantalla de inicio dibuja la misma lista, pero no pasa por acá: ya corre en el
 * servidor, así que llama directo a `leerSituacionDelNegocio` en vez de pedirse
 * a sí misma por HTTP. Las dos leen lo mismo porque leen con la misma función.
 */
export async function GET() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;

  if (!idUsuario) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }

  const leido = await leerSituacionDelNegocio(supabase, idUsuario);

  /* Sin negocio no hay alta que continuar: el dueño todavía no creó el perfil.
     Se responde 404 y no un estado vacío, porque «no existe» y «existe y está
     en el paso 1» llevan a pantallas distintas. */
  if (!leido) {
    return NextResponse.json({ error: "Primero debes registrar tu negocio." }, { status: 404 });
  }

  const estado = estadoDeAlta(leido.situacion);

  return NextResponse.json({
    completada: estado.completada,
    paso: estado.paso.id,
    ruta: estado.paso.ruta,
    cumplidos: estado.cumplidos,
    faltantes: estado.faltantes,
    /* Para saludarlo por su nombre en vez de por «usuario», que es justamente lo
       que el paso 1 existe para conseguir. */
    nombreAdmin: leido.situacion.nombreAdmin,
  });
}
