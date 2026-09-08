import { NextResponse, type NextRequest } from "next/server";

import {
  extensionPorTipo,
  validarImagenBinaria,
} from "../../../../lib/imagenes";
import { MAXIMO_FOTOS_POR_PRODUCTO, esUuid } from "../../../../lib/catalogo/validacion";
import {
  leerJson,
  obtenerContextoAdminCatalogo,
} from "../../../../lib/catalogo/servidor";

export async function POST(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }

  let formulario: FormData;
  try {
    formulario = await solicitud.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer la imagen." }, { status: 400 });
  }
  const productoId = formulario.get("producto_id");
  const archivo = formulario.get("archivo");
  if (!esUuid(productoId) || !(archivo instanceof File)) {
    return NextResponse.json({ error: "Selecciona un producto y una imagen válidos." }, { status: 400 });
  }

  const { data: producto, error: errorProducto } = await contexto.supabase
    .from("productos")
    .select("id,fotos")
    .eq("id", productoId)
    .eq("negocio_id", contexto.negocio.id)
    .is("eliminado_en", null)
    .maybeSingle();
  if (errorProducto || !producto) {
    return NextResponse.json({ error: "No se encontró el producto." }, { status: 404 });
  }
  if (producto.fotos.length >= MAXIMO_FOTOS_POR_PRODUCTO) {
    return NextResponse.json(
      { error: `Cada producto admite hasta ${MAXIMO_FOTOS_POR_PRODUCTO} imágenes.` },
      { status: 409 },
    );
  }

  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const validacion = validarImagenBinaria(bytes);
  if (!validacion.correcto) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }
  const ruta = `${contexto.negocio.id}/${producto.id}/${crypto.randomUUID()}.${extensionPorTipo(validacion.tipo)}`;
  const { error: errorSubida } = await contexto.supabase.storage
    .from("productos")
    .upload(ruta, bytes, {
      cacheControl: "31536000",
      contentType: validacion.tipo,
      upsert: false,
    });
  if (errorSubida) {
    return NextResponse.json({ error: "No se pudo subir la imagen." }, { status: 500 });
  }

  const fotos = [...producto.fotos, ruta];
  const { error: errorActualizacion } = await contexto.supabase
    .from("productos")
    .update({ fotos })
    .eq("id", producto.id)
    .eq("negocio_id", contexto.negocio.id);
  if (errorActualizacion) {
    await contexto.supabase.storage.from("productos").remove([ruta]);
    return NextResponse.json({ error: "No se pudo vincular la imagen al producto." }, { status: 500 });
  }

  const { data: datosPublicos } = contexto.supabase.storage.from("productos").getPublicUrl(ruta);
  return NextResponse.json({ ruta, url: datosPublicos.publicUrl }, { status: 201 });
}

export async function DELETE(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }
  const entrada = await leerJson(solicitud);
  if (!entrada.correcto || typeof entrada.datos !== "object" || entrada.datos === null) {
    return NextResponse.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
  }
  const datos = entrada.datos as Record<string, unknown>;
  if (!esUuid(datos.producto_id) || typeof datos.ruta !== "string") {
    return NextResponse.json({ error: "La imagen seleccionada no es válida." }, { status: 400 });
  }

  const { data: producto, error: errorProducto } = await contexto.supabase
    .from("productos")
    .select("id,fotos")
    .eq("id", datos.producto_id)
    .eq("negocio_id", contexto.negocio.id)
    .is("eliminado_en", null)
    .maybeSingle();
  if (errorProducto || !producto || !producto.fotos.includes(datos.ruta)) {
    return NextResponse.json({ error: "La imagen no pertenece a este producto." }, { status: 404 });
  }

  const { error: errorStorage } = await contexto.supabase.storage
    .from("productos")
    .remove([datos.ruta]);
  if (errorStorage) {
    return NextResponse.json({ error: "No se pudo borrar la imagen." }, { status: 500 });
  }
  const fotos = producto.fotos.filter((ruta) => ruta !== datos.ruta);
  const { error } = await contexto.supabase
    .from("productos")
    .update({ fotos })
    .eq("id", producto.id)
    .eq("negocio_id", contexto.negocio.id);
  if (error) {
    return NextResponse.json(
      { error: "La imagen se borró, pero no se pudo actualizar el producto. Recarga la página." },
      { status: 500 },
    );
  }
  return NextResponse.json({ eliminado: true });
}
