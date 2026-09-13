import { NextResponse, type NextRequest } from "next/server";

import { validarFranjas } from "../../../../../../lib/agenda/franjas";
import {
  leerJson,
  obtenerContextoAdminCatalogo,
} from "../../../../../../lib/catalogo/servidor";
import { esUuid } from "../../../../../../lib/catalogo/validacion";

/* Cuándo atiende un recurso.
 *
 * `PUT` y no `PATCH`: la semana es el conjunto, y una de sus reglas —que dos
 * tramos del mismo día no se pisen— solo se puede comprobar mirándola entera.
 */

const COLUMNAS =
  "duracion_minutos,cupo_por_franja,anticipacion_minima_horas,dias_maximos,franjas" as const;

const LIMITES = {
  duracion_minutos: [5, 480],
  cupo_por_franja: [1, 50],
  anticipacion_minima_horas: [0, 168],
  dias_maximos: [1, 180],
} as const;

function numeroEnRango(valor: unknown, campo: keyof typeof LIMITES): number | null {
  const numero = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isInteger(numero)) return null;
  const [minimo, maximo] = LIMITES[campo];
  return numero >= minimo && numero <= maximo ? numero : null;
}

async function recursoPropio(
  contexto: Awaited<ReturnType<typeof obtenerContextoAdminCatalogo>> & { correcto: true },
  recursoId: string,
) {
  const { data } = await contexto.supabase
    .from("recursos")
    .select("id")
    .eq("id", recursoId)
    .eq("negocio_id", contexto.negocio.id)
    .maybeSingle();
  return data !== null;
}

export async function GET(
  _solicitud: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }
  const { id } = await params;
  if (!esUuid(id)) {
    return NextResponse.json({ error: "El recurso no es válido." }, { status: 400 });
  }

  const { data } = await contexto.supabase
    .from("agenda_recurso")
    .select(COLUMNAS)
    .eq("recurso_id", id)
    .eq("negocio_id", contexto.negocio.id)
    .maybeSingle();

  /* Sin fila todavía se devuelve nulo y no un error: un recurso recién creado
     no tiene agenda, y eso es un estado normal. El editor dibuja los valores
     por omisión. */
  return NextResponse.json({ agenda: data ?? null });
}

export async function PUT(solicitud: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }
  const { id } = await params;
  if (!esUuid(id) || !(await recursoPropio(contexto, id))) {
    return NextResponse.json({ error: "El recurso no es válido." }, { status: 404 });
  }

  const entrada = await leerJson(solicitud);
  if (!entrada.correcto) {
    return NextResponse.json({ error: entrada.error }, { status: 400 });
  }
  const datos =
    typeof entrada.datos === "object" && entrada.datos !== null
      ? (entrada.datos as Record<string, unknown>)
      : {};

  const errores: Record<string, string> = {};
  const duracion = numeroEnRango(datos.duracionMinutos, "duracion_minutos");
  if (duracion === null) errores.duracionMinutos = "La duración va entre 5 y 480 minutos.";
  const cupo = numeroEnRango(datos.cupoPorFranja, "cupo_por_franja");
  if (cupo === null) errores.cupoPorFranja = "El cupo va entre 1 y 50.";
  const anticipacion = numeroEnRango(datos.anticipacionMinimaHoras, "anticipacion_minima_horas");
  if (anticipacion === null) errores.anticipacionMinimaHoras = "La anticipación va entre 0 y 168 horas.";
  const dias = numeroEnRango(datos.diasMaximos, "dias_maximos");
  if (dias === null) errores.diasMaximos = "Los días van entre 1 y 180.";

  const semana = validarFranjas(datos.franjas);
  if (!semana.correcto) Object.assign(errores, semana.errores);

  /* Sobre los valores y no sobre la cuenta de errores, para que el sistema de
     tipos vea que después de acá ninguno es nulo. */
  if (
    duracion === null ||
    cupo === null ||
    anticipacion === null ||
    dias === null ||
    !semana.correcto
  ) {
    return NextResponse.json({ error: "Revisá el horario.", errores }, { status: 400 });
  }

  const { data, error } = await contexto.supabase
    .from("agenda_recurso")
    .upsert(
      {
        recurso_id: id,
        negocio_id: contexto.negocio.id,
        duracion_minutos: duracion,
        cupo_por_franja: cupo,
        anticipacion_minima_horas: anticipacion,
        dias_maximos: dias,
        franjas: semana.franjas,
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: "recurso_id" },
    )
    .select(COLUMNAS)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "No se pudo guardar el horario." }, { status: 500 });
  }
  return NextResponse.json({ agenda: data });
}
