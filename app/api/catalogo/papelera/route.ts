import { NextResponse, type NextRequest } from "next/server";

import {
  leerJson,
  obtenerContextoAdminCatalogo,
  purgarPapeleraVencida,
} from "../../../../lib/catalogo/servidor";
import { esUuid } from "../../../../lib/catalogo/validacion";

type Accion = "recuperar" | "borrar";

function leerPeticion(datos: unknown): { id: string; accion: Accion } | null {
  if (typeof datos !== "object" || datos === null) return null;
  const { id, accion } = datos as { id?: unknown; accion?: unknown };
  if (!esUuid(id)) return null;
  if (accion !== "recuperar" && accion !== "borrar") return null;
  return { id, accion };
}

export async function POST(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }

  const entrada = await leerJson(solicitud);
  const peticion = entrada.correcto ? leerPeticion(entrada.datos) : null;
  if (!peticion) {
    return NextResponse.json({ error: "La petición no es válida." }, { status: 400 });
  }

  /* Se exige que esté en la papelera: sin esto, «borrar» de esta ruta sería un
     borrado definitivo de cualquier producto vivo, saltándose los treinta días
     que la papelera existe para dar. */
  const { data: producto, error: errorProducto } = await contexto.supabase
    .from("productos")
    .select("id,nombre,fotos")
    .eq("id", peticion.id)
    .eq("negocio_id", contexto.negocio.id)
    .not("eliminado_en", "is", null)
    .maybeSingle();
  if (errorProducto || !producto) {
    return NextResponse.json(
      { error: "Ese producto ya no está en la papelera." },
      { status: 404 },
    );
  }

  if (peticion.accion === "recuperar") {
    const { data, error } = await contexto.supabase
      .from("productos")
      .update({ eliminado_en: null })
      .eq("id", producto.id)
      .eq("negocio_id", contexto.negocio.id)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "No se pudo recuperar el producto." }, { status: 500 });
    }
    return NextResponse.json({ recuperado: true, nombre: producto.nombre });
  }

  /* Las fotografías van primero: si se borrara la fila antes, un fallo del
     almacenamiento dejaría archivos sin dueño que nadie va a encontrar nunca. */
  if (producto.fotos.length > 0) {
    const { error } = await contexto.supabase.storage
      .from("productos")
      .remove(producto.fotos);
    if (error) {
      return NextResponse.json(
        { error: "No se pudieron borrar las imágenes. El producto se conservó." },
        { status: 500 },
      );
    }
  }

  const { data, error } = await contexto.supabase
    .from("productos")
    .delete()
    .eq("id", producto.id)
    .eq("negocio_id", contexto.negocio.id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "No se pudo borrar el producto." }, { status: 500 });
  }

  await purgarPapeleraVencida(contexto.supabase, contexto.negocio.id);

  return NextResponse.json({ borrado: true, nombre: producto.nombre });
}
