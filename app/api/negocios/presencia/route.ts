import { NextResponse, type NextRequest } from "next/server";

import { leerJson, obtenerContextoAdminCatalogo } from "../../../../lib/catalogo/servidor";
import { cambiosDePresencia, validarPresencia } from "../../../../lib/negocios/presencia";
import { comprobarZona } from "../../../../lib/negocios/presencia-servidor";
import { siembraDeRubroPublico } from "../../../../lib/negocios/rubros-publicos";

/* «Qué vendés y dónde», desde «Mi negocio». Fase 11.
 *
 * Es lo mismo que el paso 2 del alta, con una diferencia: **acá no se siembra
 * ni se toca el rubro de siembra**. Cambiar de «Restaurante» a «Pollería» es una
 * etiqueta para el buscador; el catálogo ya está armado y no se reinicia por
 * eso.
 *
 * La única excepción es el negocio que nunca eligió siembra —los que se crearon
 * antes de que existiera el alta—: a ese se le anota la del rubro público que
 * elige, sin sembrar nada ni fijarla, para que el catálogo sepa de qué tipo es.
 */
export async function PATCH(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }

  const entrada = await leerJson(solicitud);
  if (!entrada.correcto) {
    return NextResponse.json({ error: entrada.error }, { status: 400 });
  }
  const objeto =
    typeof entrada.datos === "object" && entrada.datos !== null
      ? (entrada.datos as Record<string, unknown>)
      : {};

  const validacion = validarPresencia(objeto);
  if (!validacion.correcto) {
    return NextResponse.json(
      { error: "Revisá lo que cargaste.", errores: validacion.errores },
      { status: 400 },
    );
  }
  const { presencia } = validacion;

  const errorZona = await comprobarZona(contexto.supabase, presencia);
  if (errorZona) {
    return NextResponse.json({ error: errorZona, errores: { zona_id: errorZona } }, { status: 400 });
  }

  const { data: actual, error: errorLectura } = await contexto.supabase
    .from("negocios")
    .select("rubro")
    .eq("id", contexto.negocio.id)
    .maybeSingle();
  if (errorLectura || !actual) {
    return NextResponse.json({ error: "No se pudo leer tu negocio." }, { status: 500 });
  }

  const cambios = {
    ...cambiosDePresencia(presencia),
    ...(actual.rubro ? {} : { rubro: siembraDeRubroPublico(presencia.rubroPublico) }),
  };

  const { error } = await contexto.supabase
    .from("negocios")
    .update(cambios)
    .eq("id", contexto.negocio.id)
    .eq("admin_user_id", contexto.idUsuario);

  if (error) {
    /* La base tiene la última palabra —aparecer sin ubicación, un punto fuera
       de Bolivia—, y si rechaza algo que la validación dejó pasar, el dueño
       tiene que saber que no se guardó. */
    console.error("presencia: la base rechazó el cambio", error.code, error.message);
    return NextResponse.json({ error: "No se pudo guardar. Intentá de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ guardado: true });
}
