import { NextResponse, type NextRequest } from "next/server";

import {
  leerJson,
  obtenerContextoAdminCatalogo,
} from "../../../../lib/catalogo/servidor";
import { esUuid } from "../../../../lib/catalogo/validacion";

/* El dueño y sus turnos: los resuelve, y carga los que llegan por fuera.
 *
 * `PATCH` cambia el estado —confirmar, cumplir, cancelar—. `POST` carga una cita
 * a mano: alguien que llamó por teléfono, o un bloqueo para que el catálogo no
 * ofrezca esa hora. Las dos pasan por la misma restricción de exclusión que las
 * del catálogo: el dueño tampoco puede poner dos personas a la misma hora con
 * el mismo recurso, y si lo intenta se le dice.
 */

const ESTADOS = ["confirmada", "cancelada", "cumplida"] as const;
const CHOQUE = "23P01";

function textoLimpio(valor: unknown, tope: number): string {
  return typeof valor === "string" ? valor.trim().slice(0, tope) : "";
}

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

  if (!esUuid(datos.recursoId)) {
    return NextResponse.json({ error: "Elegí quién atiende." }, { status: 400 });
  }
  const { data: recurso } = await contexto.supabase
    .from("recursos")
    .select("id")
    .eq("id", datos.recursoId)
    .eq("negocio_id", contexto.negocio.id)
    .maybeSingle();
  if (!recurso) {
    return NextResponse.json({ error: "El recurso no es válido." }, { status: 404 });
  }

  const inicio = new Date(typeof datos.inicio === "string" ? datos.inicio : "");
  if (Number.isNaN(inicio.getTime())) {
    return NextResponse.json({ error: "Elegí el día y la hora." }, { status: 400 });
  }
  /* Un servicio dura hasta ocho horas; un bloqueo puede durar el día entero.
     Son cosas distintas y por eso el tope no es el mismo: «ocho horas» existe
     porque un servicio más largo que eso no es un turno, y un día en el que
     alguien no atiende son veinticuatro. Un bloqueo se reconoce por no tener
     producto: no es algo que se venda. */
  const esBloqueo = !datos.productoId;
  /* Treinta días: una pausa de reservas puede ser «hasta el lunes» o «hasta que
     vuelva de viaje». Un servicio sigue durando ocho horas como mucho. */
  const topeDuracion = esBloqueo ? 43_200 : 480;
  const duracion = typeof datos.duracionMinutos === "number" ? datos.duracionMinutos : Number(datos.duracionMinutos);
  if (!Number.isInteger(duracion) || duracion < 5 || duracion > topeDuracion) {
    return NextResponse.json(
      { error: `La duración va entre 5 y ${topeDuracion} minutos.` },
      { status: 400 },
    );
  }

  /* Cuál de los cupos del recurso ocupa. Un consultorio con dos cupos atiende a
     dos a la vez, y la restricción de la base solo impide que se pisen dos citas
     **del mismo** cupo. Por eso bloquear un día es ocupar todos sus cupos, y el
     que los recorre es quien llama. */
  const cupo = Number(datos.cupo ?? 1);
  if (!Number.isInteger(cupo) || cupo < 1 || cupo > 20) {
    return NextResponse.json({ error: "El cupo no es válido." }, { status: 400 });
  }
  const fin = new Date(inicio.getTime() + duracion * 60_000);

  /* El nombre es lo único obligatorio: en un bloqueo, es el motivo —«Reunión»,
     «Banco»—. El teléfono se acepta si viene y se normaliza como en el catálogo. */
  const nombre = textoLimpio(datos.nombre, 80);
  if (nombre === "") {
    return NextResponse.json({ error: "Escribí un nombre o el motivo del bloqueo." }, { status: 400 });
  }
  let telefono: string | null = null;
  const telefonoCrudo = textoLimpio(datos.telefono, 20).replace(/\D/g, "");
  if (telefonoCrudo !== "") {
    telefono = telefonoCrudo.length === 8 ? `591${telefonoCrudo}` : telefonoCrudo;
    if (!/^591[67]\d{7}$/.test(telefono)) {
      return NextResponse.json({ error: "El WhatsApp no es válido. Dejalo vacío si no lo tenés." }, { status: 400 });
    }
  }

  /* El producto es opcional y, si viene, tiene que ser de este negocio y de una
     categoría que venda tiempo. Sin esto se podría colgar un turno de una bolsa
     de alimento. */
  let productoId: string | null = null;
  let categoriaId: string | null = null;
  if (datos.productoId !== undefined && datos.productoId !== null && datos.productoId !== "") {
    if (!esUuid(datos.productoId)) {
      return NextResponse.json({ error: "El servicio no es válido." }, { status: 400 });
    }
    const { data: producto } = await contexto.supabase
      .from("productos")
      .select("id,categoria_id,categorias!inner(vende)")
      .eq("id", datos.productoId)
      .eq("negocio_id", contexto.negocio.id)
      .is("eliminado_en", null)
      .maybeSingle();
    const categoria = producto?.categorias as { vende?: string } | { vende?: string }[] | null;
    const vende = Array.isArray(categoria) ? categoria[0]?.vende : categoria?.vende;
    if (!producto || vende !== "tiempo") {
      return NextResponse.json({ error: "Ese producto no es un servicio." }, { status: 400 });
    }
    productoId = producto.id;
    categoriaId = producto.categoria_id;
  }

  const { data, error } = await contexto.supabase
    .from("citas")
    .insert({
      negocio_id: contexto.negocio.id,
      recurso_id: datos.recursoId as string,
      producto_id: productoId,
      categoria_id: categoriaId,
      rango: `[${inicio.toISOString()},${fin.toISOString()})`,
      cupo,
      nombre_cliente: nombre,
      telefono_cliente: telefono,
      nota_interna: textoLimpio(datos.notaInterna, 300) || null,
      origen: "manual",
      /* Lo que el dueño carga a mano nace confirmado: él es quien confirma. */
      estado: "confirmada",
    })
    .select("id,codigo")
    .maybeSingle();

  if (error?.code === CHOQUE) {
    return NextResponse.json(
      { error: "Ese horario ya está ocupado para este recurso." },
      { status: 409 },
    );
  }
  if (error || !data) {
    return NextResponse.json({ error: "No se pudo guardar el turno." }, { status: 500 });
  }
  return NextResponse.json({ cita: data }, { status: 201 });
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
    return NextResponse.json({ error: "El turno no es válido." }, { status: 400 });
  }

  const cambios: { estado?: string; cancelado_en?: string | null; nota_interna?: string | null } = {};

  if (datos.estado !== undefined) {
    if (typeof datos.estado !== "string" || !(ESTADOS as readonly string[]).includes(datos.estado)) {
      return NextResponse.json({ error: "Indicá qué hacer con el turno." }, { status: 400 });
    }
    cambios.estado = datos.estado;
    /* La cancelación lleva su marca de tiempo porque la base la exige: sin ella
       el `check` rechaza la fila. Y con motivo: una cita cancelada sin cuándo no
       se puede auditar después. */
    cambios.cancelado_en = datos.estado === "cancelada" ? new Date().toISOString() : null;
  }
  if (datos.notaInterna !== undefined) {
    cambios.nota_interna = textoLimpio(datos.notaInterna, 300) || null;
  }
  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: "No hay nada que cambiar." }, { status: 400 });
  }

  const { data, error } = await contexto.supabase
    .from("citas")
    .update(cambios)
    .eq("id", datos.id)
    .eq("negocio_id", contexto.negocio.id)
    .select("id,estado,nota_interna")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "No se pudo actualizar el turno." }, { status: 404 });
  }
  return NextResponse.json({ cita: data });
}
