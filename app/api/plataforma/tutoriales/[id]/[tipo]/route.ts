import { NextResponse, type NextRequest } from "next/server";

import { COLUMNAS_TUTORIAL } from "../../../../../../lib/catalogo/columnas";
import { esUuid } from "../../../../../../lib/catalogo/validacion";
import { sesionDePlataforma } from "../../../../../../lib/plataforma/sesion-de-plataforma";
import { claveEnBalde, guardarEnBalde } from "../../../../../../lib/tutoriales/archivos";
import { baldeTutoriales, largoFijo } from "../../../../../../lib/tutoriales/balde";
import {
  ARCHIVOS,
  esFormatoCorrecto,
  esTipoArchivo,
  nombreNuevo,
} from "../../../../../../lib/tutoriales/validacion";

/* Sube el video o la portada de un tutorial: `PUT` con el archivo tal cual en
 * el cuerpo, sin formulario, para que el Worker lo pase a R2 sin juntarlo en
 * memoria.
 *
 * El orden es el de las fotos de los productos: primero se sube el archivo
 * nuevo, después se vincula, y recién ahí se borra el anterior. Un corte en el
 * medio deja, como mucho, un archivo sin uso; nunca un tutorial apuntando a un
 * archivo que no existe.
 */
const error = (mensaje: string, estado: number) => NextResponse.json({ error: mensaje }, { status: estado });

export async function PUT(
  solicitud: NextRequest,
  { params }: { params: Promise<{ id: string; tipo: string }> },
) {
  const { id, tipo } = await params;
  if (!esUuid(id) || !esTipoArchivo(tipo)) return error("No existe.", 404);
  const archivo = ARCHIVOS[tipo];

  /* El tamaño se mira antes que nada, sin leer el cuerpo (413). */
  const largo = Number(solicitud.headers.get("content-length"));
  if (!Number.isInteger(largo) || largo <= 0) return error("Falta el tamaño del archivo.", 411);
  if (largo > archivo.tope) return error(`El archivo pasa de ${archivo.texto}.`, 413);
  if (solicitud.headers.get("content-type") !== archivo.tipo) {
    return error(tipo === "video" ? "El video tiene que ser MP4." : "La portada tiene que ser JPG.", 415);
  }

  const sesion = await sesionDePlataforma();
  if (sesion.rechazo) return sesion.rechazo;
  const { supabase } = sesion;

  const balde = baldeTutoriales();
  if (!balde) return error("El almacenamiento de los videos no está conectado.", 503);
  if (!solicitud.body) return error("Falta el archivo.", 400);

  const { data: actual } = await supabase.from("tutoriales").select("numero,video,portada").eq("id", id).maybeSingle();
  if (!actual) return error("El tutorial no existe.", 404);

  const nombre = nombreNuevo(actual.numero, tipo);
  try {
    const guardado = await guardarEnBalde(balde, nombre, solicitud.body, largo, (comienzo) =>
      esFormatoCorrecto(tipo, comienzo), largoFijo);
    if (guardado === "formato") {
      return error(tipo === "video" ? "El archivo no es un video MP4." : "El archivo no es una imagen JPG.", 415);
    }
  } catch {
    return error("No se pudo subir el archivo. Revisa tu conexión y vuelve a intentarlo.", 502);
  }

  /* La duración la lee el navegador de la cabecera del MP4; solo se muestra, y
     la base la acota. */
  const duracion = Number(solicitud.nextUrl.searchParams.get("duracion"));
  const cambio =
    tipo === "video"
      ? { video: nombre, duracion_segundos: Number.isInteger(duracion) && duracion >= 1 && duracion <= 1800 ? duracion : null }
      : { portada: nombre };
  const { data, error: fallo } = await supabase
    .from("tutoriales")
    .update(cambio)
    .eq("id", id)
    .select(COLUMNAS_TUTORIAL)
    .maybeSingle();
  if (fallo || !data) {
    await balde.delete(claveEnBalde(nombre)).catch(() => {});
    return error("No se pudo guardar el archivo en el tutorial.", 500);
  }

  const anterior = tipo === "video" ? actual.video : actual.portada;
  if (anterior) await balde.delete(claveEnBalde(anterior)).catch(() => {});
  return NextResponse.json({ tutorial: data });
}
