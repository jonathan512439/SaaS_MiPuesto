import { NextResponse, type NextRequest } from "next/server";

import {
  LIMITE_SUBCATEGORIAS_POR_CATEGORIA,
  esUuid,
  normalizarNombreOrganizacion,
  validarNombreOrganizacion,
} from "../../../../lib/catalogo/validacion";
import {
  leerJson,
  obtenerContextoAdminCatalogo,
} from "../../../../lib/catalogo/servidor";

export async function POST(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }
  const entrada = await leerJson(solicitud);
  if (!entrada.correcto || typeof entrada.datos !== "object" || entrada.datos === null) {
    return NextResponse.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
  }
  const datos = entrada.datos as Record<string, unknown>;
  if (!esUuid(datos.categoria_id)) {
    return NextResponse.json({ error: "La categoría no es válida." }, { status: 400 });
  }
  const errorNombre = validarNombreOrganizacion(datos.nombre);
  if (errorNombre) return NextResponse.json({ error: errorNombre }, { status: 400 });

  const { data: categoria } = await contexto.supabase
    .from("categorias")
    .select("id")
    .eq("id", datos.categoria_id)
    .eq("negocio_id", contexto.negocio.id)
    .maybeSingle();
  if (!categoria) {
    return NextResponse.json({ error: "La categoría no pertenece a tu negocio." }, { status: 404 });
  }
  const { count } = await contexto.supabase
    .from("subcategorias")
    .select("id", { count: "exact", head: true })
    .eq("categoria_id", categoria.id);
  if ((count ?? 0) >= LIMITE_SUBCATEGORIAS_POR_CATEGORIA) {
    return NextResponse.json(
      { error: `Cada categoría admite hasta ${LIMITE_SUBCATEGORIAS_POR_CATEGORIA} subcategorías.` },
      { status: 409 },
    );
  }
  const { data: ultima } = await contexto.supabase
    .from("subcategorias")
    .select("orden")
    .eq("categoria_id", categoria.id)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await contexto.supabase
    .from("subcategorias")
    .insert({
      categoria_id: categoria.id,
      nombre: normalizarNombreOrganizacion(datos.nombre as string),
      orden: (ultima?.orden ?? 0) + 1,
    })
    .select("id,categoria_id,nombre,orden")
    .single();
  if (error) {
    return NextResponse.json({ error: "No se pudo crear la subcategoría." }, { status: 500 });
  }
  return NextResponse.json({ subcategoria: data }, { status: 201 });
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
  if (!esUuid(datos.id)) {
    return NextResponse.json({ error: "La subcategoría no es válida." }, { status: 400 });
  }

  const { data: actual } = await contexto.supabase
    .from("subcategorias")
    .select("id,categoria_id,nombre,orden,categorias!inner(negocio_id)")
    .eq("id", datos.id)
    .eq("categorias.negocio_id", contexto.negocio.id)
    .maybeSingle();
  if (!actual) {
    return NextResponse.json({ error: "No se encontró la subcategoría." }, { status: 404 });
  }

  if (typeof datos.nombre === "string") {
    const errorNombre = validarNombreOrganizacion(datos.nombre);
    if (errorNombre) return NextResponse.json({ error: errorNombre }, { status: 400 });
    const { data, error } = await contexto.supabase
      .from("subcategorias")
      .update({ nombre: normalizarNombreOrganizacion(datos.nombre) })
      .eq("id", actual.id)
      .select("id,categoria_id,nombre,orden")
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "No se pudo actualizar la subcategoría." }, { status: 500 });
    }
    return NextResponse.json({ subcategoria: data });
  }

  if (datos.direccion !== "subir" && datos.direccion !== "bajar") {
    return NextResponse.json({ error: "Indicá un cambio válido." }, { status: 400 });
  }
  const { data: subcategorias, error: errorLista } = await contexto.supabase
    .from("subcategorias")
    .select("id,categoria_id,nombre,orden")
    .eq("categoria_id", actual.categoria_id)
    .order("orden")
    .order("nombre");
  if (errorLista) {
    return NextResponse.json({ error: "No se pudo ordenar la subcategoría." }, { status: 500 });
  }
  const indice = subcategorias.findIndex((subcategoria) => subcategoria.id === actual.id);
  const indiceDestino = datos.direccion === "subir" ? indice - 1 : indice + 1;
  if (indice < 0 || indiceDestino < 0 || indiceDestino >= subcategorias.length) {
    return NextResponse.json({ subcategorias });
  }
  const destino = subcategorias[indiceDestino];
  const [resultadoActual, resultadoDestino] = await Promise.all([
    contexto.supabase.from("subcategorias").update({ orden: destino.orden }).eq("id", actual.id),
    contexto.supabase
      .from("subcategorias")
      .update({ orden: actual.orden })
      .eq("id", destino.id),
  ]);
  if (resultadoActual.error || resultadoDestino.error) {
    return NextResponse.json({ error: "No se pudo ordenar la subcategoría." }, { status: 500 });
  }
  const reordenadas = [...subcategorias];
  [reordenadas[indice], reordenadas[indiceDestino]] = [
    reordenadas[indiceDestino],
    reordenadas[indice],
  ];
  return NextResponse.json({ subcategorias: reordenadas });
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
    return NextResponse.json({ error: "La subcategoría no es válida." }, { status: 400 });
  }
  const { data, error } = await contexto.supabase
    .from("subcategorias")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "No se pudo borrar la subcategoría." }, { status: 404 });
  }
  return NextResponse.json({ eliminado: true });
}
