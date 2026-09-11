import { NextResponse, type NextRequest } from "next/server";

import {
  LIMITE_CATEGORIAS,
  esUuid,
  normalizarNombreOrganizacion,
  validarNombreOrganizacion,
} from "../../../../lib/catalogo/validacion";
import {
  ICONO_PREDETERMINADO,
  validarIdentidadCategoria,
} from "../../../../lib/catalogo/categorias";
import { COLUMNAS_CATEGORIA } from "../../../../lib/catalogo/columnas";
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
  const cuerpo =
    typeof entrada.datos === "object" && entrada.datos !== null
      ? (entrada.datos as Record<string, unknown>)
      : {};
  const errorNombre = validarNombreOrganizacion(cuerpo.nombre);
  if (errorNombre) return NextResponse.json({ error: errorNombre }, { status: 400 });

  /* El ícono y qué vende se eligen al crearla, no después: elegirlos acá es lo
     que hace que la categoría nazca con su esfera dibujada. Los dos son
     opcionales y tienen valor por omisión, así que quien no los mande —la
     importación, la carga por foto— sigue funcionando igual. */
  const identidad = validarIdentidadCategoria({ icono: cuerpo.icono, vende: cuerpo.vende });
  if (!identidad.correcto) {
    return NextResponse.json(
      { error: "Revisá los datos de la categoría.", errores: identidad.errores },
      { status: 400 },
    );
  }

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
      nombre: normalizarNombreOrganizacion(cuerpo.nombre as string),
      orden: (ultima?.orden ?? 0) + 1,
      icono: (cuerpo.icono as string | undefined) ?? ICONO_PREDETERMINADO,
      vende: (cuerpo.vende as string | undefined) ?? "cosas",
    })
    .select(COLUMNAS_CATEGORIA)
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

  /* Reordenar va aparte y se comprueba primero: mueve **dos** filas y no cambia
     ninguna columna de la que se pide, así que mezclarla con el resto obligaría
     a que una misma petición hiciera dos cosas distintas. */
  if (datos.direccion === undefined) {
    /* Escrito con las columnas exactas y no como `Record<string, unknown>`: el
       cliente de la base rechaza lo segundo, y con razón. Un objeto abierto
       dejaría pasar cualquier nombre de columna que llegara del navegador. */
    const cambios: {
      nombre?: string;
      icono?: string;
      visible?: boolean;
      vende?: string;
    } = {};

    if (datos.nombre !== undefined) {
      const errorNombre = validarNombreOrganizacion(datos.nombre);
      if (errorNombre) return NextResponse.json({ error: errorNombre }, { status: 400 });
      cambios.nombre = normalizarNombreOrganizacion(datos.nombre as string);
    }

    const identidad = validarIdentidadCategoria(datos);
    if (!identidad.correcto) {
      return NextResponse.json(
        { error: "Revisá los datos de la categoría.", errores: identidad.errores },
        { status: 400 },
      );
    }
    /* Se copia campo por campo y no con un `...datos`: el cuerpo viene del
       navegador y podría traer `negocio_id`, que le entregaría la categoría a
       otro negocio. El `as` va después del validador, que es quien comprobó que
       cada uno es lo que dice ser. */
    if (datos.icono !== undefined) cambios.icono = datos.icono as string;
    if (datos.visible !== undefined) cambios.visible = datos.visible as boolean;
    if (datos.vende !== undefined) cambios.vende = datos.vende as string;

    if (Object.keys(cambios).length === 0) {
      return NextResponse.json({ error: "No hay nada que cambiar." }, { status: 400 });
    }

    const { data, error } = await contexto.supabase
      .from("categorias")
      .update(cambios)
      .eq("id", datos.id)
      .eq("negocio_id", contexto.negocio.id)
      .select(COLUMNAS_CATEGORIA)
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
    .select(COLUMNAS_CATEGORIA)
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
