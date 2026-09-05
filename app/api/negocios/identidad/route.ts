import { NextResponse, type NextRequest } from "next/server";


import { obtenerContextoAdminCatalogo, leerJson } from "../../../../lib/catalogo/servidor";
import { extensionPorTipo, validarImagenBinaria } from "../../../../lib/imagenes";
import {
  CAMPO_POR_TIPO_IMAGEN,
  esTipoImagenIdentidad,
  normalizarRedesSociales,
  normalizarUbicacion,
  rutaPerteneceAImagenNegocio,
  type TipoImagenIdentidad,
} from "../../../../lib/negocios/identidad";
import type { Database } from "../../../../lib/supabase/database.types";

type ActualizacionNegocio = Database["public"]["Tables"]["negocios"]["Update"];

const COLUMNAS_IDENTIDAD =
  "slug,logo_url,portada_url,qr_pago_url,redes_sociales,ubicacion_url";

function cambioImagen(tipo: TipoImagenIdentidad, ruta: string | null): ActualizacionNegocio {
  return { [CAMPO_POR_TIPO_IMAGEN[tipo]]: ruta };
}

export async function PATCH(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }
  const entrada = await leerJson(solicitud);
  const redes = entrada.correcto
    ? normalizarRedesSociales(
        typeof entrada.datos === "object" && entrada.datos !== null && "redes_sociales" in entrada.datos
          ? entrada.datos.redes_sociales
          : null,
      )
    : { correcto: false as const, errores: { general: entrada.error } };
  if (!redes.correcto) {
    return NextResponse.json(
      { error: "Revisa los enlaces de contacto.", errores: redes.errores },
      { status: 400 },
    );
  }

  const ubicacion = normalizarUbicacion(
    entrada.correcto &&
      typeof entrada.datos === "object" &&
      entrada.datos !== null &&
      "ubicacion_url" in entrada.datos
      ? entrada.datos.ubicacion_url
      : null,
  );
  if (!ubicacion.correcto) {
    return NextResponse.json(
      { error: "Revisa los enlaces de contacto.", errores: { ubicacion_url: ubicacion.error } },
      { status: 400 },
    );
  }

  const { data, error } = await contexto.supabase
    .from("negocios")
    .update({
      redes_sociales: redes.redes,
      ubicacion_url: ubicacion.ubicacion || null,
    })
    .eq("id", contexto.negocio.id)
    .eq("admin_user_id", contexto.idUsuario)
    .select(COLUMNAS_IDENTIDAD)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "No se pudieron guardar los enlaces." }, { status: 500 });
  }

  return NextResponse.json({ identidad: data });
}

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
  const tipo = formulario.get("tipo");
  const archivo = formulario.get("archivo");
  if (!esTipoImagenIdentidad(tipo) || !(archivo instanceof File)) {
    return NextResponse.json({ error: "Selecciona un tipo y una imagen válidos." }, { status: 400 });
  }

  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const validacion = validarImagenBinaria(bytes);
  if (!validacion.correcto) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }
  const { data: negocioActual, error: errorLectura } = await contexto.supabase
    .from("negocios")
    .select(COLUMNAS_IDENTIDAD)
    .eq("id", contexto.negocio.id)
    .eq("admin_user_id", contexto.idUsuario)
    .maybeSingle();
  if (errorLectura || !negocioActual) {
    return NextResponse.json({ error: "No se pudo comprobar la identidad del negocio." }, { status: 500 });
  }

  const campo = CAMPO_POR_TIPO_IMAGEN[tipo];
  const anterior = negocioActual[campo];
  const ruta = `${contexto.negocio.id}/${tipo}/${crypto.randomUUID()}.${extensionPorTipo(validacion.tipo)}`;
  const { error: errorSubida } = await contexto.supabase.storage
    .from("negocios")
    .upload(ruta, bytes, {
      cacheControl: "31536000",
      contentType: validacion.tipo,
      upsert: false,
    });
  if (errorSubida) {
    return NextResponse.json({ error: "No se pudo subir la imagen." }, { status: 500 });
  }

  const { data: identidad, error: errorActualizacion } = await contexto.supabase
    .from("negocios")
    .update(cambioImagen(tipo, ruta))
    .eq("id", contexto.negocio.id)
    .eq("admin_user_id", contexto.idUsuario)
    .select(COLUMNAS_IDENTIDAD)
    .maybeSingle();
  if (errorActualizacion || !identidad) {
    await contexto.supabase.storage.from("negocios").remove([ruta]);
    return NextResponse.json({ error: "No se pudo vincular la imagen al negocio." }, { status: 500 });
  }

  if (
    anterior &&
    rutaPerteneceAImagenNegocio(anterior, contexto.negocio.id, tipo)
  ) {
    const { error: errorBorrado } = await contexto.supabase.storage
      .from("negocios")
      .remove([anterior]);
    if (errorBorrado) {
      await contexto.supabase
        .from("negocios")
        .update(cambioImagen(tipo, anterior))
        .eq("id", contexto.negocio.id)
        .eq("admin_user_id", contexto.idUsuario);
      await contexto.supabase.storage.from("negocios").remove([ruta]);
      return NextResponse.json(
        { error: "No se pudo reemplazar la imagen anterior. Se conservaron los datos originales." },
        { status: 500 },
      );
    }
  }


  const { data: datosPublicos } = contexto.supabase.storage.from("negocios").getPublicUrl(ruta);
  return NextResponse.json(
    { identidad, imagen: { tipo, ruta, url: datosPublicos.publicUrl } },
    { status: 201 },
  );
}

export async function DELETE(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }
  const entrada = await leerJson(solicitud);
  const tipo =
    entrada.correcto && typeof entrada.datos === "object" && entrada.datos !== null && "tipo" in entrada.datos
      ? entrada.datos.tipo
      : undefined;
  if (!esTipoImagenIdentidad(tipo)) {
    return NextResponse.json({ error: "La imagen seleccionada no es válida." }, { status: 400 });
  }
  const campo = CAMPO_POR_TIPO_IMAGEN[tipo];
  const { data: negocioActual, error: errorLectura } = await contexto.supabase
    .from("negocios")
    .select(COLUMNAS_IDENTIDAD)
    .eq("id", contexto.negocio.id)
    .eq("admin_user_id", contexto.idUsuario)
    .maybeSingle();
  if (errorLectura || !negocioActual) {
    return NextResponse.json({ error: "No se pudo comprobar la imagen." }, { status: 500 });
  }
  const anterior = negocioActual[campo];
  if (!anterior) return NextResponse.json({ eliminado: true, identidad: negocioActual });
  if (!rutaPerteneceAImagenNegocio(anterior, contexto.negocio.id, tipo)) {
    return NextResponse.json({ error: "La imagen guardada no pertenece a este negocio." }, { status: 409 });
  }

  const { data: identidad, error: errorActualizacion } = await contexto.supabase
    .from("negocios")
    .update(cambioImagen(tipo, null))
    .eq("id", contexto.negocio.id)
    .eq("admin_user_id", contexto.idUsuario)
    .select(COLUMNAS_IDENTIDAD)
    .maybeSingle();
  if (errorActualizacion || !identidad) {
    return NextResponse.json({ error: "No se pudo desvincular la imagen." }, { status: 500 });
  }
  const { error: errorBorrado } = await contexto.supabase.storage
    .from("negocios")
    .remove([anterior]);
  if (errorBorrado) {
    await contexto.supabase
      .from("negocios")
      .update(cambioImagen(tipo, anterior))
      .eq("id", contexto.negocio.id)
      .eq("admin_user_id", contexto.idUsuario);
    return NextResponse.json(
      { error: "No se pudo borrar el archivo. La imagen se mantuvo vinculada." },
      { status: 500 },
    );
  }

  return NextResponse.json({ eliminado: true, identidad });
}
