import { NextResponse, type NextRequest } from "next/server";

import { esUuid } from "../../../lib/catalogo/validacion";
import { leerJson, obtenerContextoAdminCatalogo } from "../../../lib/catalogo/servidor";
import {
  LIMITE_PROMOCIONES,
  validarPromocion,
} from "../../../lib/promociones/validacion";

const COLUMNAS_PROMOCION =
  "id,negocio_id,tipo,valor,producto_id,categoria_id,fecha_inicio,fecha_fin,activo,hora_inicio,hora_fin,dias";

async function validarDestino(
  contexto: Extract<Awaited<ReturnType<typeof obtenerContextoAdminCatalogo>>, { correcto: true }>,
  productoId: string | null,
  categoriaId: string | null,
) {
  const consulta = productoId
    ? contexto.supabase
        .from("productos")
        .select("id")
        .eq("id", productoId)
        .eq("negocio_id", contexto.negocio.id)
        .is("eliminado_en", null)
        .maybeSingle()
    : contexto.supabase
        .from("categorias")
        .select("id")
        .eq("id", categoriaId as string)
        .eq("negocio_id", contexto.negocio.id)
        .maybeSingle();
  const { data, error } = await consulta;
  return !error && Boolean(data);
}

export async function POST(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }
  const entrada = await leerJson(solicitud);
  const validacion = entrada.correcto
    ? validarPromocion(entrada.datos)
    : { correcto: false as const, errores: { general: entrada.error } };
  if (!validacion.correcto) {
    return NextResponse.json(
      { error: "Revisá los datos de la promoción.", errores: validacion.errores },
      { status: 400 },
    );
  }

  const { count, error: errorConteo } = await contexto.supabase
    .from("promociones")
    .select("id", { count: "exact", head: true })
    .eq("negocio_id", contexto.negocio.id);
  if (errorConteo) {
    return NextResponse.json({ error: "No se pudieron revisar tus promociones." }, { status: 500 });
  }
  if ((count ?? 0) >= LIMITE_PROMOCIONES) {
    return NextResponse.json(
      { error: `Podés conservar hasta ${LIMITE_PROMOCIONES} promociones. Borrá una anterior para continuar.` },
      { status: 409 },
    );
  }

  if (
    !(await validarDestino(
      contexto,
      validacion.datos.producto_id,
      validacion.datos.categoria_id,
    ))
  ) {
    return NextResponse.json(
      { error: "El producto o la categoría no pertenece a tu negocio." },
      { status: 400 },
    );
  }

  const { data, error } = await contexto.supabase
    .from("promociones")
    .insert({ ...validacion.datos, negocio_id: contexto.negocio.id })
    .select(COLUMNAS_PROMOCION)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "No se pudo crear la promoción." }, { status: 500 });
  }
  return NextResponse.json({ promocion: data }, { status: 201 });
}

export async function PATCH(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }
  const entrada = await leerJson(solicitud);
  if (!entrada.correcto || typeof entrada.datos !== "object" || entrada.datos === null) {
    return NextResponse.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
  }
  const datos = entrada.datos as Record<string, unknown>;
  if (!esUuid(datos.id) || typeof datos.activo !== "boolean") {
    return NextResponse.json({ error: "La promoción seleccionada no es válida." }, { status: 400 });
  }
  const { data, error } = await contexto.supabase
    .from("promociones")
    .update({ activo: datos.activo })
    .eq("id", datos.id)
    .eq("negocio_id", contexto.negocio.id)
    .select(COLUMNAS_PROMOCION)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "No se pudo cambiar la promoción." }, { status: 404 });
  }
  return NextResponse.json({ promocion: data });
}

export async function DELETE(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }
  const entrada = await leerJson(solicitud);
  const id =
    entrada.correcto &&
    typeof entrada.datos === "object" &&
    entrada.datos !== null &&
    "id" in entrada.datos
      ? entrada.datos.id
      : undefined;
  if (!esUuid(id)) {
    return NextResponse.json({ error: "La promoción seleccionada no es válida." }, { status: 400 });
  }
  const { data, error } = await contexto.supabase
    .from("promociones")
    .delete()
    .eq("id", id)
    .eq("negocio_id", contexto.negocio.id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "No se pudo borrar la promoción." }, { status: 404 });
  }
  return NextResponse.json({ eliminado: true });
}
