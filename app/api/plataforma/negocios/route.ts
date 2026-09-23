import { NextResponse, type NextRequest } from "next/server";

import { esUuid } from "../../../../lib/catalogo/validacion";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import { esRubroPublicoId, siembraDeRubroPublico } from "../../../../lib/negocios/rubros-publicos";

/* La autorización no se comprueba acá: la hacen las funciones de la base, que
 * exigen ser administrador de la plataforma y fallan con «no autorizado» si no.
 * Repetir el control en la ruta daría una segunda fuente de verdad que puede
 * quedar desincronizada; dejarlo solo en la base garantiza que ni una petición
 * armada a mano lo salte.
 */
const ACCIONES = ["renovar", "publicar", "despublicar", "foto_ia", "plan", "rubro_publico"] as const;
type Accion = (typeof ACCIONES)[number];

function esAccion(valor: unknown): valor is Accion {
  return ACCIONES.includes(valor as Accion);
}

export async function POST(solicitud: NextRequest) {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  if (!datosClaims?.claims.sub) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }

  let entrada: unknown;
  try {
    entrada = await solicitud.json();
  } catch {
    return NextResponse.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
  }

  const datos = (entrada ?? {}) as Record<string, unknown>;
  if (!esUuid(datos.negocio_id) || !esAccion(datos.accion)) {
    return NextResponse.json({ error: "La acción no es válida." }, { status: 400 });
  }

  /* El rubro público lo cambia la plataforma cuando el comerciante lo pide
     (fase 11). Solo dentro del mismo tipo de catálogo: pasar de «Pollería» a
     «Juguetería» cambiaría la siembra, y eso es «Cambiar rubro», que exporta y
     reinicia. Esa comprobación vive acá porque la lista de siembras es de
     TypeScript; que quien llama sea administrador lo exige la función. */
  if (datos.accion === "rubro_publico") {
    if (!esRubroPublicoId(datos.rubro_publico)) {
      return NextResponse.json({ error: "Elegí un rubro de la lista." }, { status: 400 });
    }
    const { data: negocio } = await supabase
      .from("negocios")
      .select("rubro")
      .eq("id", datos.negocio_id)
      .maybeSingle();
    if (negocio?.rubro && siembraDeRubroPublico(datos.rubro_publico) !== negocio.rubro) {
      return NextResponse.json(
        {
          error:
            "Ese rubro es de otro tipo de catálogo. Para pasar a él usá «Cambiar rubro», que exporta y reinicia el catálogo.",
        },
        { status: 409 },
      );
    }
  }

  const resultado =
    datos.accion === "rubro_publico"
      ? await supabase.rpc("admin_cambiar_rubro_publico", {
          p_negocio_id: datos.negocio_id,
          p_rubro_publico: String(datos.rubro_publico),
        })
      : datos.accion === "foto_ia"
      ? await supabase.rpc("admin_cambiar_foto_ia", {
          p_negocio_id: datos.negocio_id,
          p_habilitada: datos.habilitada === true,
        })
      : datos.accion === "plan"
      ? await supabase.rpc("admin_cambiar_plan", {
          p_negocio_id: datos.negocio_id,
          /* Se manda tal cual llega y la base decide si lo conoce: su
             restricción es la que manda, no una lista repetida acá. */
          p_plan: String(datos.plan ?? ""),
        })
      : datos.accion === "renovar"
      ? await supabase.rpc("admin_renovar_suscripcion", {
          p_negocio_id: datos.negocio_id,
          p_meses: Number(datos.meses ?? 1),
        })
      : await supabase.rpc("admin_cambiar_publicacion", {
          p_negocio_id: datos.negocio_id,
          p_activo: datos.accion === "publicar",
          p_motivo: typeof datos.motivo === "string" ? datos.motivo.slice(0, 200) : undefined,
        });

  if (resultado.error) {
    /* El mensaje de la base se traduce acá: «NO_AUTORIZADO» no le dice nada a
       quien lee la pantalla, y devolver el error crudo filtra detalle interno. */
    const noAutorizado = resultado.error.message.includes("NO_AUTORIZADO");

    return NextResponse.json(
      {
        error: noAutorizado
          ? "Tu cuenta no administra la plataforma."
          : "No se pudo aplicar el cambio.",
      },
      { status: noAutorizado ? 403 : 500 },
    );
  }

  return NextResponse.json({ resultado: resultado.data });
}
