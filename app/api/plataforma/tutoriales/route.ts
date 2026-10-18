import { NextResponse, type NextRequest } from "next/server";

import { COLUMNAS_TUTORIAL } from "../../../../lib/catalogo/columnas";
import { esUuid } from "../../../../lib/catalogo/validacion";
import { sesionDePlataforma } from "../../../../lib/plataforma/sesion-de-plataforma";
import { claveEnBalde } from "../../../../lib/tutoriales/archivos";
import { baldeTutoriales } from "../../../../lib/tutoriales/balde";
import { leerDatosTutorial } from "../../../../lib/tutoriales/validacion";

/* Los datos de los tutoriales, desde Plataforma: crear, editar, publicar,
 * ocultar y eliminar. Los archivos se suben por `[id]/[tipo]`.
 *
 * La política de `tutoriales` exige plataforma y segundo factor; esta ruta lo
 * comprueba antes solo para decir el motivo, y porque eliminar también borra
 * archivos de R2, que no tiene políticas.
 */
const error = (mensaje: string, estado: number) => NextResponse.json({ error: mensaje }, { status: estado });

export async function POST(solicitud: NextRequest) {
  const sesion = await sesionDePlataforma();
  if (sesion.rechazo) return sesion.rechazo;
  const { supabase } = sesion;

  let entrada: Record<string, unknown>;
  try {
    const datos = (await solicitud.json()) as unknown;
    if (typeof datos !== "object" || datos === null) throw new Error();
    entrada = datos as Record<string, unknown>;
  } catch {
    return error("Los datos enviados no son válidos.", 400);
  }

  if (entrada.accion === "crear" || entrada.accion === "editar") {
    const leido = leerDatosTutorial(entrada);
    if (!leido.correcto) return error(leido.error, 400);
    const consulta =
      entrada.accion === "crear"
        ? supabase.from("tutoriales").insert(leido.datos)
        : esUuid(entrada.id)
          ? supabase.from("tutoriales").update(leido.datos).eq("id", entrada.id)
          : null;
    if (!consulta) return error("Falta el tutorial.", 400);
    const { data, error: fallo } = await consulta.select(COLUMNAS_TUTORIAL).maybeSingle();
    if (fallo?.code === "23505") return error(`Ya hay un tutorial con el número ${leido.datos.numero}.`, 409);
    if (fallo || !data) return error("No se pudo guardar el tutorial.", 500);
    return NextResponse.json({ tutorial: data }, { status: entrada.accion === "crear" ? 201 : 200 });
  }

  if (!esUuid(entrada.id)) return error("Falta el tutorial.", 400);

  if (entrada.accion === "publicar" || entrada.accion === "ocultar") {
    const { data, error: fallo } = await supabase
      .from("tutoriales")
      .update({ publicado: entrada.accion === "publicar" })
      .eq("id", entrada.id)
      .select(COLUMNAS_TUTORIAL)
      .maybeSingle();
    /* La base no deja publicar sin video (`tutoriales_publicado_con_video`). */
    if (fallo?.code === "23514") return error("Sube el video antes de publicarlo.", 400);
    if (fallo || !data) return error("No se pudo cambiar el tutorial.", 500);
    return NextResponse.json({ tutorial: data });
  }

  if (entrada.accion === "eliminar") {
    /* Primero la fila y después los archivos: si el borrado de R2 falla, queda
       un archivo sin uso, que no se ve; al revés quedaría una tarjeta con un
       video roto. */
    const { data, error: fallo } = await supabase
      .from("tutoriales")
      .delete()
      .eq("id", entrada.id)
      .select("video,portada")
      .maybeSingle();
    if (fallo || !data) return error("No se pudo eliminar el tutorial.", 500);
    const archivos = [data.video, data.portada].filter((nombre): nombre is string => Boolean(nombre));
    const balde = baldeTutoriales();
    if (balde && archivos.length) await balde.delete(archivos.map(claveEnBalde)).catch(() => {});
    return NextResponse.json({ eliminado: entrada.id });
  }

  return error("Acción desconocida.", 400);
}
