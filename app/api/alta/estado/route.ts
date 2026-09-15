import { NextResponse } from "next/server";

import { estadoDeAlta } from "../../../../lib/negocios/alta";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";

/* En qué paso del alta está el negocio, y qué le falta para publicar.
 *
 * Lo consulta el panel para decidir a dónde mandar al dueño al entrar, y la
 * pantalla de inicio para dibujar la lista de pendientes.
 *
 * **Las cuentas de productos y categorías se piden con `head` y `count`**: lo
 * que hace falta saber es *si hay*, no cuáles son, y traerse trescientas filas
 * para después contarlas es pagar una consulta grande en el camino que más se
 * recorre del panel.
 */
export async function GET() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;

  if (!idUsuario) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }

  const { data: negocio, error } = await supabase
    .from("negocios")
    .select(
      "id,nombre,slug,nombre_admin,rubro,telefono_whatsapp,logo_url,alta_paso,alta_completada_en",
    )
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "No se pudo leer tu negocio." }, { status: 500 });
  }

  /* Sin negocio no hay alta que continuar: el dueño todavía no creó el perfil.
     Se responde 404 y no un estado vacío, porque «no existe» y «existe y está
     en el paso 1» llevan a pantallas distintas. */
  if (!negocio) {
    return NextResponse.json({ error: "Primero debes registrar tu negocio." }, { status: 404 });
  }

  const [{ count: productos }, { count: categorias }] = await Promise.all([
    supabase
      .from("productos")
      .select("id", { count: "exact", head: true })
      .eq("negocio_id", negocio.id),
    supabase
      .from("categorias")
      .select("id", { count: "exact", head: true })
      .eq("negocio_id", negocio.id),
  ]);

  const estado = estadoDeAlta({
    nombreAdmin: negocio.nombre_admin,
    nombre: negocio.nombre,
    slug: negocio.slug,
    rubro: negocio.rubro,
    telefonoWhatsapp: negocio.telefono_whatsapp,
    logoUrl: negocio.logo_url,
    productos: productos ?? 0,
    categorias: categorias ?? 0,
    altaPaso: negocio.alta_paso,
    altaCompletadaEn: negocio.alta_completada_en,
  });

  return NextResponse.json({
    completada: estado.completada,
    paso: estado.paso.id,
    ruta: estado.paso.ruta,
    cumplidos: estado.cumplidos,
    faltantes: estado.faltantes,
    /* Para saludarlo por su nombre en vez de por «usuario», que es justamente lo
       que el paso 1 existe para conseguir. */
    nombreAdmin: negocio.nombre_admin,
  });
}
