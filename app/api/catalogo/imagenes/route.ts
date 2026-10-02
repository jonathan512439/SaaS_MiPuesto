import {
  MENSAJE_SIN_ESPACIO,
  esRechazoPorEspacio,
  sinEspacioParaFotos,
} from "../../../../lib/catalogo/almacenamiento";
import { NextResponse, type NextRequest } from "next/server";

import {
  PESO_MAXIMO_COMPRIMIDO,
  extensionPorTipo,
  subidaDemasiadoGrande,
  validarImagenBinaria,
} from "../../../../lib/imagenes";
import { esUuid } from "../../../../lib/catalogo/validacion";
import {
  esRechazoDeTope,
  mensajeLimiteFotos,
} from "../../../../lib/catalogo/topes-del-plan";
import { topesDelPlan } from "../../../../lib/planes";
import {
  leerJson,
  obtenerContextoAdminCatalogo,
} from "../../../../lib/catalogo/servidor";

const MENSAJE_FOTO_GRANDE = "La imagen supera el límite de 2 MB.";

export async function POST(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }

  /* El tamaño se mira antes de leer nada: leer el formulario trae la petición
     entera a memoria, y el navegador comprime, pero quien se lo salte podía
     mandar un archivo enorme y gastar la memoria del Worker. */
  if (subidaDemasiadoGrande(solicitud.headers.get("content-length"))) {
    return NextResponse.json({ error: MENSAJE_FOTO_GRANDE }, { status: 413 });
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
  if (producto.fotos.length >= topesDelPlan(contexto.negocio.plan_id).fotosPorProducto) {
    return NextResponse.json(
      { error: mensajeLimiteFotos(contexto.negocio.plan_id) },
      { status: 409 },
    );
  }

  if (archivo.size > PESO_MAXIMO_COMPRIMIDO) {
    return NextResponse.json({ error: MENSAJE_FOTO_GRANDE }, { status: 413 });
  }
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const validacion = validarImagenBinaria(bytes);
  if (!validacion.correcto) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }
  /* El espacio de fotos del negocio: si ya no hay lugar, se dice antes de
     subir y con palabras. La regla de la base lo hace cumplir igual. */
  if (await sinEspacioParaFotos(contexto.supabase, contexto.negocio.id)) {
    return NextResponse.json({ error: MENSAJE_SIN_ESPACIO }, { status: 409 });
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
    if (esRechazoPorEspacio(errorSubida.message)) {
      return NextResponse.json({ error: MENSAJE_SIN_ESPACIO }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo subir la imagen." }, { status: 500 });
  }

  /* La referencia se agrega en la base, en una sola sentencia: dos subidas a
     la vez ya no leen la misma lista y se pisan. El tope de fotos lo sigue
     cuidando la base. */
  const { error: errorActualizacion } = await contexto.supabase.rpc("agregar_foto_producto", {
    p_producto_id: producto.id,
    p_ruta: ruta,
  });
  if (errorActualizacion) {
    await contexto.supabase.storage.from("productos").remove([ruta]);
    if (esRechazoDeTope(errorActualizacion.message, "LIMITE_FOTOS")) {
      return NextResponse.json(
        { error: mensajeLimiteFotos(contexto.negocio.plan_id) },
        { status: 409 },
      );
    }
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

  /* Primero la referencia, después el archivo. Al revés, si fallaba lo segundo
     el catálogo mostraba una foto rota; así, lo peor es un archivo sin uso,
     que la conciliación de fotos encuentra después. */
  const { error } = await contexto.supabase.rpc("quitar_foto_producto", {
    p_producto_id: producto.id,
    p_ruta: datos.ruta,
  });
  if (error) {
    return NextResponse.json({ error: "No se pudo borrar la imagen." }, { status: 500 });
  }
  const { error: errorStorage } = await contexto.supabase.storage
    .from("productos")
    .remove([datos.ruta]);
  if (errorStorage) {
    console.warn("imagenes: la foto se quitó del producto, pero el archivo quedó en Storage", datos.ruta);
  }
  return NextResponse.json({ eliminado: true });
}
