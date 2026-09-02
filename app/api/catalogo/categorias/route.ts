import { NextResponse, type NextRequest } from "next/server";

import {
  LIMITE_CATEGORIAS,
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
  if (!entrada.correcto) return NextResponse.json({ error: entrada.error }, { status: 400 });
  const nombre =
    typeof entrada.datos === "object" && entrada.datos !== null && "nombre" in entrada.datos
      ? entrada.datos.nombre
      : undefined;
  const errorNombre = validarNombreOrganizacion(nombre);
  if (errorNombre) return NextResponse.json({ error: errorNombre }, { status: 400 });

  const { count } = await contexto.supabase
    .from("categorias")
    .select("id", { count: "exact", head: true })
    .eq("negocio_id", contexto.negocio.id);
  if ((count ?? 0) >= LIMITE_CATEGORIAS) {
    return NextResponse.json(
      { error: `Puedes crear hasta ${LIMITE_CATEGORIAS} categorías.` },
      { status: 409 },
    );
  }

  const { data: ultima } = await contexto.supabase
    .from("categorias")
    .select("orden")
    .eq("negocio_id", contexto.negocio.id)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await contexto.supabase
    .from("categorias")
    .insert({
      negocio_id: contexto.negocio.id,
      nombre: normalizarNombreOrganizacion(nombre as string),
      orden: (ultima?.orden ?? 0) + 1,
    })
    .select("id,nombre,orden")
    .single();

  if (error) {
    return NextResponse.json({ error: "No se pudo crear la categoría." }, { status: 500 });
  }
  return NextResponse.json({ categoria: data }, { status: 201 });
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
    return NextResponse.json({ error: "La categoría no es válida." }, { status: 400 });
  }

  if (typeof datos.nombre === "string") {
    const errorNombre = validarNombreOrganizacion(datos.nombre);
    if (errorNombre) return NextResponse.json({ error: errorNombre }, { status: 400 });
    const { data, error } = await contexto.supabase
      .from("categorias")
      .update({ nombre: normalizarNombreOrganizacion(datos.nombre) })
      .eq("id", datos.id)
      .eq("negocio_id", contexto.negocio.id)
      .select("id,nombre,orden")
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "No se pudo actualizar la categoría." }, { status: 404 });
    }
    return NextResponse.json({ categoria: data });
  }

  if (datos.direccion !== "subir" && datos.direccion !== "bajar") {
    return NextResponse.json({ error: "Indica un cambio válido." }, { status: 400 });
  }
  const { data: categorias, error: errorLista } = await contexto.supabase
    .from("categorias")
    .select("id,nombre,orden")
    .eq("negocio_id", contexto.negocio.id)
    .order("orden")
    .order("nombre");
  if (errorLista) {
    return NextResponse.json({ error: "No se pudo ordenar la categoría." }, { status: 500 });
  }
  const indice = categorias.findIndex((categoria) => categoria.id === datos.id);
  const indiceDestino = datos.direccion === "subir" ? indice - 1 : indice + 1;
  if (indice < 0 || indiceDestino < 0 || indiceDestino >= categorias.length) {
    return NextResponse.json({ categorias });
  }
  const actual = categorias[indice];
  const destino = categorias[indiceDestino];
  const [resultadoActual, resultadoDestino] = await Promise.all([
    contexto.supabase.from("categorias").update({ orden: destino.orden }).eq("id", actual.id),
    contexto.supabase.from("categorias").update({ orden: actual.orden }).eq("id", destino.id),
  ]);
  if (resultadoActual.error || resultadoDestino.error) {
    return NextResponse.json({ error: "No se pudo ordenar la categoría." }, { status: 500 });
  }
  const reordenadas = [...categorias];
  [reordenadas[indice], reordenadas[indiceDestino]] = [
    reordenadas[indiceDestino],
    reordenadas[indice],
  ];
  return NextResponse.json({ categorias: reordenadas });
}

export async function DELETE(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }
  const entrada = await leerJson(solicitud);
  const id =
    entrada.correcto && typeof entrada.datos === "object" && entrada.datos !== null && "id" in entrada.datos
      ? entrada.datos.id
      : undefined;
  if (!esUuid(id)) return NextResponse.json({ error: "La categoría no es válida." }, { status: 400 });

  const { data, error } = await contexto.supabase
    .from("categorias")
    .delete()
    .eq("id", id)
    .eq("negocio_id", contexto.negocio.id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "No se pudo borrar la categoría." }, { status: 404 });
  }
  return NextResponse.json({ eliminado: true });
}
