import { NextResponse, type NextRequest } from "next/server";

import { leerJson, obtenerContextoAdminCatalogo } from "../../../../lib/catalogo/servidor";
import { cambiosDePresencia, validarPresencia } from "../../../../lib/negocios/presencia";
import { comprobarZona } from "../../../../lib/negocios/presencia-servidor";
import {
  MENSAJE_RUBRO_FIJO,
  rubroQuedoFijo,
  siembraDeRubroPublico,
} from "../../../../lib/negocios/rubros-publicos";

/* «Qué vendes y dónde», desde «Mi negocio». Fase 11.
 *
 * Es lo mismo que el paso 2 del alta, con dos diferencias:
 *
 * - **El rubro no se cambia desde acá.** Se elige una vez; si el negocio ya
 *   tiene uno y llega otro, se rechaza y se le dice que nos escriba. Lo cambia
 *   la plataforma. Lo que sí se edita libremente es lo demás: los rubros extra,
 *   si quiere aparecer y dónde está.
 * - **Acá no se siembra.** El negocio que nunca eligió —los de antes del alta—
 *   elige una vez, y se le anota la siembra de ese rubro y se la fija, sin
 *   sembrar nada: su catálogo ya existe.
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
      { error: "Revisa lo que cargaste.", errores: validacion.errores },
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
    .select("rubro,rubro_publico,rubro_bloqueado_en")
    .eq("id", contexto.negocio.id)
    .maybeSingle();
  if (errorLectura || !actual) {
    return NextResponse.json({ error: "No se pudo leer tu negocio." }, { status: 500 });
  }

  if (rubroQuedoFijo(actual.rubro_publico) && presencia.rubroPublico !== actual.rubro_publico) {
    return NextResponse.json(
      { error: MENSAJE_RUBRO_FIJO, errores: { rubro_publico: MENSAJE_RUBRO_FIJO } },
      { status: 409 },
    );
  }

  const cambios = {
    ...cambiosDePresencia(presencia),
    ...(actual.rubro ? {} : { rubro: siembraDeRubroPublico(presencia.rubroPublico) }),
    ...(actual.rubro_bloqueado_en ? {} : { rubro_bloqueado_en: new Date().toISOString() }),
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
    return NextResponse.json({ error: "No se pudo guardar. Intenta de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ guardado: true });
}
