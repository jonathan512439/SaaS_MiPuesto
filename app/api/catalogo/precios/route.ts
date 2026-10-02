import { NextResponse, type NextRequest } from "next/server";

import { cambiosDeAjuste, validarAjustePrecios } from "../../../../lib/catalogo/precios-lote";
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
    .eq("negocio_id", contexto.negocio.id)
    .is("eliminado_en", null);
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

  /* Todo o nada, y nunca dos veces. Antes se recorría producto por producto
     sin transacción: un corte tras 80 de 300 dejaba esos 80 ajustados y el
     reintento les aplicaba el porcentaje otra vez. Ahora el cálculo queda acá
     y `aplicar_ajuste_de_precios` aplica la lista entera en una transacción,
     con el identificador del intento que manda el panel: el mismo intento dos
     veces no ajusta de nuevo. Si el panel no lo manda, se crea uno: el ajuste
     sigue siendo todo o nada, aunque sin la protección contra el reintento. */
  const cuerpo = (entrada.correcto ? entrada.datos : {}) as Record<string, unknown>;
  const idempotencia = esUuid(cuerpo.idempotencia) ? cuerpo.idempotencia : crypto.randomUUID();
  const { data: ajustados, error } = await contexto.supabase.rpc("aplicar_ajuste_de_precios", {
    p_idempotencia: idempotencia,
    p_porcentaje: porcentaje,
    p_cambios: cambiosDeAjuste(productos, porcentaje),
  });
  if (error) {
    const fueraDeRango = error.code === "23514";
    return NextResponse.json(
      {
        error: fueraDeRango
          ? "Algún precio quedaría fuera de rango, así que no se ajustó ninguno."
          : "No se ajustó ningún precio. Vuelve a intentarlo.",
      },
      { status: fueraDeRango ? 400 : 500 },
    );
  }

  return NextResponse.json({ ajustados: ajustados ?? 0, revisados: productos.length });
}
