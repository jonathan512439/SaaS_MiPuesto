import { NextResponse, type NextRequest } from "next/server";

import {
  leerJson,
  obtenerContextoAdminCatalogo,
} from "../../../../../../lib/catalogo/servidor";
import { validarVariantes } from "../../../../../../lib/catalogo/variantes";
import { esUuid } from "../../../../../../lib/catalogo/validacion";

/* Las presentaciones de un producto.
 *
 * `PUT` y no `PATCH` por presentación, por lo mismo que los campos de categoría:
 * dos de las reglas —hasta doce, sin nombres repetidos— son sobre el conjunto, y
 * el editor guarda todo junto.
 */

const COLUMNAS = "id,nombre,precio,cantidad_stock,visible,orden" as const;

export async function GET(
  _solicitud: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }
  const { id } = await params;
  if (!esUuid(id)) {
    return NextResponse.json({ error: "El producto no es válido." }, { status: 400 });
  }

  const { data, error } = await contexto.supabase
    .from("variantes_producto")
    .select(COLUMNAS)
    .eq("producto_id", id)
    .eq("negocio_id", contexto.negocio.id)
    .order("orden");
  if (error) {
    return NextResponse.json({ error: "No se pudieron leer las presentaciones." }, { status: 500 });
  }
  return NextResponse.json({ variantes: data });
}

export async function PUT(solicitud: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }
  const { id } = await params;
  if (!esUuid(id)) {
    return NextResponse.json({ error: "El producto no es válido." }, { status: 400 });
  }

  /* Se trae el producto con su categoría porque las dos cosas deciden qué es
     válido: si el producto controla existencias, y si su categoría vende tiempo
     —en cuyo caso no tiene presentaciones sino horarios—. Además comprueba de
     paso que el producto sea de este negocio. */
  const { data: producto } = await contexto.supabase
    .from("productos")
    .select("id,controla_stock,cantidad_reservada,categoria_id,categorias(vende)")
    .eq("id", id)
    .eq("negocio_id", contexto.negocio.id)
    .is("eliminado_en", null)
    .maybeSingle();
  if (!producto) {
    return NextResponse.json({ error: "No se encontró el producto." }, { status: 404 });
  }

  const entrada = await leerJson(solicitud);
  if (!entrada.correcto) {
    return NextResponse.json({ error: entrada.error }, { status: 400 });
  }
  const crudas =
    typeof entrada.datos === "object" && entrada.datos !== null && "variantes" in entrada.datos
      ? entrada.datos.variantes
      : [];

  const categoria = producto.categorias as { vende?: string } | null;
  const validacion = validarVariantes(crudas, {
    controlaStock: producto.controla_stock === true,
    vendeTiempo: categoria?.vende === "tiempo",
  });
  if (!validacion.correcto) {
    return NextResponse.json(
      { error: "Revisá las presentaciones.", errores: validacion.errores },
      { status: 400 },
    );
  }

  /* Borra primero y agrega después, con la misma dependencia de orden que los
     campos de categoría: el disparador del tope cuenta las filas que hay en ese
     momento, y al insertar antes un reemplazo legítimo pasaría por un estado con
     trece. La migración dice lo mismo del otro lado. */
  const { error: errorBorrado } = await contexto.supabase
    .from("variantes_producto")
    .delete()
    .eq("producto_id", id)
    .eq("negocio_id", contexto.negocio.id);
  if (errorBorrado) {
    return NextResponse.json(
      { error: "No se pudieron guardar las presentaciones." },
      { status: 500 },
    );
  }

  if (validacion.variantes.length > 0) {
    const { error: errorInsercion } = await contexto.supabase.from("variantes_producto").insert(
      validacion.variantes.map((variante, indice) => ({
        producto_id: id,
        negocio_id: contexto.negocio.id,
        nombre: variante.nombre,
        precio: variante.precio,
        cantidad_stock: variante.cantidadStock,
        visible: variante.visible,
        orden: indice,
      })),
    );
    if (errorInsercion) {
      return NextResponse.json(
        {
          error:
            "No se pudieron guardar las presentaciones y las anteriores se perdieron. Volvé a cargarlas.",
        },
        { status: 500 },
      );
    }
  }

  const { data, error } = await contexto.supabase
    .from("variantes_producto")
    .select(COLUMNAS)
    .eq("producto_id", id)
    .eq("negocio_id", contexto.negocio.id)
    .order("orden");
  if (error) {
    return NextResponse.json({ error: "No se pudieron leer las presentaciones." }, { status: 500 });
  }
  return NextResponse.json({ variantes: data });
}
