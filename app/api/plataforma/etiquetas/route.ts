import { NextResponse, type NextRequest } from "next/server";

import { esUuid } from "../../../../lib/catalogo/validacion";
import {
  esCodigoEtiqueta,
  generarCodigoEtiqueta,
  normalizarCodigoEtiqueta,
} from "../../../../lib/plataforma/etiquetas";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";

/* La autorización vive en la política de RLS de `etiquetas`, que exige
 * `es_admin_plataforma()`. No se repite acá: una segunda fuente de verdad se
 * desincroniza, y la de la base es la que ni una petición armada a mano saltea.
 */
const INTENTOS_CODIGO = 5;

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

  if (datos.accion === "crear") {
    const nota = typeof datos.nota === "string" ? datos.nota.trim().slice(0, 120) : "";
    /* Se reintenta con otro código en vez de comprobar antes si existe: entre
       la comprobación y la escritura cabe otra petición, y la clave primaria es
       la única que decide de verdad. */
    for (let intento = 0; intento < INTENTOS_CODIGO; intento += 1) {
      const { data, error } = await supabase
        .from("etiquetas")
        .insert({ codigo: generarCodigoEtiqueta(), nota: nota || null })
        .select("codigo,negocio_id,nota,creado_en,ultimo_uso_en")
        .maybeSingle();
      if (data) return NextResponse.json({ etiqueta: data }, { status: 201 });
      if (error?.code !== "23505") {
        const noAutorizado = error?.code === "42501";
        return NextResponse.json(
          {
            error: noAutorizado
              ? "Tu cuenta no administra la plataforma."
              : "No se pudo crear la etiqueta.",
          },
          { status: noAutorizado ? 403 : 500 },
        );
      }
    }
    return NextResponse.json(
      { error: "No se pudo encontrar un código libre. Probá otra vez." },
      { status: 503 },
    );
  }

  const codigo = normalizarCodigoEtiqueta(datos.codigo);
  if (!esCodigoEtiqueta(codigo)) {
    return NextResponse.json({ error: "El código no es válido." }, { status: 400 });
  }

  if (datos.accion !== "asignar" && datos.accion !== "liberar") {
    return NextResponse.json({ error: "La acción no es válida." }, { status: 400 });
  }

  const negocioId = datos.accion === "asignar" ? datos.negocio_id : null;
  if (datos.accion === "asignar" && !esUuid(negocioId)) {
    return NextResponse.json({ error: "El negocio no es válido." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("etiquetas")
    .update({
      negocio_id: negocioId as string | null,
      /* Se anota cuándo cambió de dueño, que es el dato que explica por qué una
         etiqueta lleva a un negocio distinto del que alguien recuerda. */
      reasignado_en: new Date().toISOString(),
    })
    .eq("codigo", codigo)
    .select("codigo,negocio_id,nota,creado_en,ultimo_uso_en")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "No se pudo actualizar la etiqueta." }, { status: 404 });
  }
  return NextResponse.json({ etiqueta: data });
}
