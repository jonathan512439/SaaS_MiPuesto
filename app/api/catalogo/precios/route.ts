import { NextResponse, type NextRequest } from "next/server";

import { aplicarPorcentaje, validarAjustePrecios } from "../../../../lib/catalogo/precios-lote";
import {
  leerJson,
  obtenerContextoAdminCatalogo,
} from "../../../../lib/catalogo/servidor";
import { esUuid } from "../../../../lib/catalogo/validacion";

/* Subir precios de a uno sobre trescientos productos es lo que hace que un
   catálogo quede desactualizado con la inflación. El disparador
   `productos_registrar_cambio_precio` guarda el precio anterior en cada fila,
   así que este ajuste es reversible producto por producto y no infla ninguna
   tabla de auditoría. */
export async function POST(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }

  const entrada = await leerJson(solicitud);
  const validacion = entrada.correcto
    ? validarAjustePrecios(entrada.datos)
    : { correcto: false as const, error: entrada.error };
  if (!validacion.correcto) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }

  const { categoria_id, porcentaje } = validacion.datos;
  if (categoria_id !== null && !esUuid(categoria_id)) {
    return NextResponse.json({ error: "La categoría no es válida." }, { status: 400 });
  }

  let consulta = contexto.supabase
    .from("productos")
    .select("id,precio")
    .eq("negocio_id", contexto.negocio.id);
  if (categoria_id) consulta = consulta.eq("categoria_id", categoria_id);

  const { data: productos, error: errorLectura } = await consulta;
  if (errorLectura) {
    return NextResponse.json({ error: "No se pudo leer el catálogo." }, { status: 500 });
  }
  if (!productos || productos.length === 0) {
    return NextResponse.json(
      { error: "No hay productos que ajustar con ese filtro." },
      { status: 409 },
    );
  }

  /* Se recorre producto por producto y no con una sola sentencia porque el
     disparador que guarda el precio anterior es por fila, y porque así un
     precio que quedaría fuera de rango se corrige solo en ese producto. */
  let ajustados = 0;
  for (const producto of productos) {
    const nuevoPrecio = aplicarPorcentaje(Number(producto.precio), porcentaje);
    if (nuevoPrecio === Number(producto.precio)) continue;

    const { error } = await contexto.supabase
      .from("productos")
      .update({ precio: nuevoPrecio })
      .eq("id", producto.id)
      .eq("negocio_id", contexto.negocio.id);
    if (error) {
      return NextResponse.json(
        {
          error: `Se ajustaron ${ajustados} productos y el proceso se detuvo. Volvé a intentarlo.`,
        },
        { status: 500 },
      );
    }
    ajustados += 1;
  }

  return NextResponse.json({ ajustados, revisados: productos.length });
}
