import { NextResponse, type NextRequest } from "next/server";

import {
  describirCita,
  horarioValido,
  proximosDias,
  rangoDeCita,
} from "../../../../../lib/agenda/horarios";
import { obtenerOcupacion, obtenerProductoAgendable } from "../../../../../lib/agenda/servidor";
import { esUuid } from "../../../../../lib/catalogo/validacion";
import { crearClienteSupabaseAdmin } from "../../../../../lib/supabase/admin";
import { construirEnlaceWhatsapp } from "../../../../../lib/whatsapp";
import { formatearPrecioBolivianos } from "../../../../../lib/precios";

/* Tomar un horario.
 *
 * **Confía en la restricción de exclusión de la base y no pregunta antes.**
 * Intenta insertar; si Postgres rechaza por solapamiento, responde 409 con los
 * horarios actualizados. Consultar primero y escribir después deja una ventana
 * entre las dos cosas donde dos personas ganan el mismo turno, y ese error no se
 * puede probar que no ocurre porque depende del tiempo.
 */

export const dynamic = "force-dynamic";

/* El código que Postgres usa para una violación de restricción de exclusión. Es
   la señal de que alguien ganó el horario primero, y es lo único que distingue
   ese caso de un error de verdad. */
const CHOQUE = "23P01";

function textoLimpio(valor: unknown, tope: number): string {
  return typeof valor === "string" ? valor.trim().slice(0, tope) : "";
}

export async function POST(
  solicitud: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = (await solicitud.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "No se pudo leer el pedido." }, { status: 400 });
  }

  const productoId = typeof cuerpo.productoId === "string" ? cuerpo.productoId : "";
  if (!esUuid(productoId)) {
    return NextResponse.json({ error: "El producto no es válido." }, { status: 400 });
  }

  const nombre = textoLimpio(cuerpo.nombre, 80);
  if (nombre === "") {
    return NextResponse.json({ error: "Escribí tu nombre." }, { status: 400 });
  }

  const telefono = textoLimpio(cuerpo.telefono, 20).replace(/\D/g, "");
  const telefonoCompleto = telefono.length === 8 ? `591${telefono}` : telefono;
  if (!/^591[67]\d{7}$/.test(telefonoCompleto)) {
    return NextResponse.json({ error: "Escribí un número de WhatsApp válido." }, { status: 400 });
  }

  const inicio = typeof cuerpo.inicio === "string" ? cuerpo.inicio : "";
  const nota = textoLimpio(cuerpo.nota, 300) || null;
  const idempotencia = typeof cuerpo.idempotencia === "string" ? cuerpo.idempotencia : "";
  if (!esUuid(idempotencia)) {
    return NextResponse.json({ error: "El pedido no es válido." }, { status: 400 });
  }

  const supabase = crearClienteSupabaseAdmin();
  const { data: negocio } = await supabase
    .from("negocios")
    .select("id,nombre,telefono_whatsapp")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();
  if (!negocio) {
    return NextResponse.json({ error: "Este negocio no está disponible." }, { status: 404 });
  }

  const producto = await obtenerProductoAgendable(supabase, negocio.id, productoId);
  if (!producto) {
    return NextResponse.json({ error: "Este producto no se agenda." }, { status: 409 });
  }

  const ahora = new Date();

  /* Que el horario caiga de verdad en la agenda. Sin esto, una petición armada a
     mano podría reservar las 3 de la mañana de un domingo: la exclusión la
     aceptaría sin chistar, porque no choca con ninguna otra cita. */
  if (!horarioValido(producto.agenda, inicio, ahora)) {
    return NextResponse.json(
      { error: "Ese horario ya no se puede pedir. Elegí otro." },
      { status: 409 },
    );
  }

  const rango = rangoDeCita(producto.agenda, inicio);

  /* Se prueba cupo por cupo, de uno hasta el máximo de la franja. El primero que
     entra gana; los que chocan con una cita existente rebotan y se prueba el
     siguiente. Dos consultorios son dos cupos, y el tercero que llegue no
     encuentra ninguno libre.

     Buscar cuál está libre con un `select` y después insertar sería el error que
     esto evita: entre las dos consultas, otro puede tomarlo. */
  for (let cupo = 1; cupo <= producto.agenda.cupoPorFranja; cupo += 1) {
    const { data, error } = await supabase
      .from("citas")
      .insert({
        negocio_id: negocio.id,
        producto_id: producto.id,
        categoria_id: producto.categoriaId,
        /* El recurso es la dueña del calendario: la restricción de exclusión
           mira esta columna. La categoría se guarda igual, para agrupar. */
        recurso_id: producto.recursoId,
        rango: `[${rango.inicio},${rango.fin})`,
        cupo,
        nombre_cliente: nombre,
        telefono_cliente: telefonoCompleto,
        nota,
        idempotencia,
      })
      .select("codigo")
      .maybeSingle();

    if (!error && data) {
      const cuando = describirCita(rango.inicio);
      const mensaje = [
        `Hola, agendé ${producto.nombre} en el catálogo de ${negocio.nombre}.`,
        `Cuándo: ${cuando}.`,
        `Precio publicado: ${formatearPrecioBolivianos(producto.precio)}.`,
        `Código: ${data.codigo}.`,
        `A nombre de: ${nombre}.`,
        ...(nota ? [`Nota: ${nota}.`] : []),
      ].join("\n");

      return NextResponse.json(
        {
          cita: { codigo: data.codigo, inicio: rango.inicio, cuando },
          enlaceWhatsapp: construirEnlaceWhatsapp(negocio.telefono_whatsapp, mensaje),
        },
        { status: 201 },
      );
    }

    /* El mismo pedido mandado dos veces —un doble toque en un teléfono lento— no
       genera dos citas: la segunda choca con la clave de idempotencia y se
       devuelve la que ya existe. */
    if (error?.code === "23505") {
      const { data: existente } = await supabase
        .from("citas")
        .select("codigo,rango")
        .eq("idempotencia", idempotencia)
        .maybeSingle();
      if (existente) {
        return NextResponse.json({
          cita: {
            codigo: existente.codigo,
            inicio: rango.inicio,
            cuando: describirCita(rango.inicio),
          },
          repetido: true,
        });
      }
    }

    if (error?.code !== CHOQUE) {
      return NextResponse.json({ error: "No se pudo agendar. Intentá otra vez." }, { status: 500 });
    }
    /* Fue un choque: este cupo está ocupado, se prueba el siguiente. */
  }

  /* Se acabaron los cupos de esa franja mientras esta persona elegía. Se
     devuelven los horarios al día para que pueda elegir otro sin recargar. */
  const hasta = new Date(ahora.getTime() + (producto.agenda.diasMaximos + 1) * 86_400_000);
  const ocupados = await obtenerOcupacion(supabase, producto.recursoId, ahora, hasta);
  return NextResponse.json(
    {
      error: "Ese horario se acaba de ocupar. Elegí otro.",
      dias: proximosDias(producto.agenda, ocupados, ahora),
    },
    { status: 409 },
  );
}
