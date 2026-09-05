import { NextResponse, type NextRequest } from "next/server";

import {
  LIMITE_PRODUCTOS,
  esUuid,
  estadoPorStock,
  validarProducto,
} from "../../../../lib/catalogo/validacion";
import {
  leerJson,
  obtenerContextoAdminCatalogo,
  purgarPapeleraVencida,
  validarJerarquiaProducto,
} from "../../../../lib/catalogo/servidor";

const COLUMNAS_PRODUCTO =
  "id,codigo,categoria_id,subcategoria_id,nombre,descripcion,precio,precio_anterior,precio_actualizado_en,precio_actualizado_por,fotos,controla_stock,cantidad_stock,cantidad_reservada,visible,estado,orden";

export async function POST(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }

  const entrada = await leerJson(solicitud);
  const validacion = entrada.correcto
    ? validarProducto(entrada.datos)
    : { correcto: false as const, errores: { general: entrada.error } };
  if (!validacion.correcto) {
    return NextResponse.json({ error: "Revisa los datos del producto.", errores: validacion.errores }, { status: 400 });
  }

  const { count, error: errorConteo } = await contexto.supabase
    .from("productos")
    .select("id", { count: "exact", head: true })
    .eq("negocio_id", contexto.negocio.id)
    .is("eliminado_en", null);
  if (errorConteo) {
    return NextResponse.json({ error: "No se pudo comprobar el catálogo." }, { status: 500 });
  }
  if ((count ?? 0) >= LIMITE_PRODUCTOS) {
    return NextResponse.json(
      { error: `Puedes registrar hasta ${LIMITE_PRODUCTOS} productos.` },
      { status: 409 },
    );
  }

  const errorJerarquia = await validarJerarquiaProducto(
    contexto.supabase,
    contexto.negocio.id,
    validacion.datos.categoria_id,
    validacion.datos.subcategoria_id,
  );
  if (errorJerarquia) return NextResponse.json({ error: errorJerarquia }, { status: 400 });

  const { data: ultimo } = await contexto.supabase
    .from("productos")
    .select("orden")
    .eq("negocio_id", contexto.negocio.id)
    .is("eliminado_en", null)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await contexto.supabase
    .from("productos")
    .insert({
      ...validacion.datos,
      negocio_id: contexto.negocio.id,
      estado: estadoPorStock(
        validacion.datos.controla_stock,
        validacion.datos.cantidad_stock,
        0,
      ),
      orden: (ultimo?.orden ?? 0) + 1,
    })
    .select(COLUMNAS_PRODUCTO)
    .single();
  if (error) {
    return NextResponse.json({ error: "No se pudo crear el producto." }, { status: 500 });
  }

  return NextResponse.json({ producto: data }, { status: 201 });
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
    return NextResponse.json({ error: "El producto no es válido." }, { status: 400 });
  }

  if (typeof datos.visible === "boolean" && Object.keys(datos).every((clave) => clave === "id" || clave === "visible")) {
    const { data, error } = await contexto.supabase
      .from("productos")
      .update({ visible: datos.visible })
      .eq("id", datos.id)
      .eq("negocio_id", contexto.negocio.id)
      .is("eliminado_en", null)
      .select(COLUMNAS_PRODUCTO)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "No se pudo cambiar la visibilidad." }, { status: 404 });
    }
    return NextResponse.json({ producto: data });
  }

  /* Marcar agotado es lo que un negocio hace varias veces al día, y hacerlo por
     el formulario completo es tanto trabajo que se termina no haciendo: el
     catálogo miente y el cliente pide algo que no hay. */
  if (
    typeof datos.agotado === "boolean" &&
    Object.keys(datos).every((clave) => clave === "id" || clave === "agotado")
  ) {
    const { data: actual } = await contexto.supabase
      .from("productos")
      .select("controla_stock,cantidad_stock,cantidad_reservada")
      .eq("id", datos.id)
      .eq("negocio_id", contexto.negocio.id)
      .is("eliminado_en", null)
      .maybeSingle();
    if (!actual) {
      return NextResponse.json({ error: "No se encontró el producto." }, { status: 404 });
    }

    /* Con control de existencias el estado lo decide el stock, así que marcar
       agotado es dejarlo en cero. Reponer no se puede adivinar: cuántas
       unidades llegaron lo sabe el dueño y va por el formulario. */
    if (actual.controla_stock && !datos.agotado) {
      return NextResponse.json(
        { error: "Este producto lleva existencias: indicá cuántas unidades hay." },
        { status: 409 },
      );
    }

    const cambios = actual.controla_stock
      ? { cantidad_stock: 0, estado: "agotado" }
      : { estado: datos.agotado ? "agotado" : "disponible" };

    const { data, error } = await contexto.supabase
      .from("productos")
      .update(cambios)
      .eq("id", datos.id)
      .eq("negocio_id", contexto.negocio.id)
      .is("eliminado_en", null)
      .select(COLUMNAS_PRODUCTO)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "No se pudo cambiar el estado." }, { status: 500 });
    }
    return NextResponse.json({ producto: data });
  }

  const validacion = validarProducto(datos);
  if (!validacion.correcto) {
    return NextResponse.json({ error: "Revisa los datos del producto.", errores: validacion.errores }, { status: 400 });
  }
  const errorJerarquia = await validarJerarquiaProducto(
    contexto.supabase,
    contexto.negocio.id,
    validacion.datos.categoria_id,
    validacion.datos.subcategoria_id,
  );
  if (errorJerarquia) return NextResponse.json({ error: errorJerarquia }, { status: 400 });

  const { data: productoActual, error: errorProductoActual } = await contexto.supabase
    .from("productos")
    .select("cantidad_reservada")
    .eq("id", datos.id)
    .eq("negocio_id", contexto.negocio.id)
    .is("eliminado_en", null)
    .maybeSingle();
  if (errorProductoActual || !productoActual) {
    return NextResponse.json({ error: "No se encontró el producto." }, { status: 404 });
  }
  if (
    productoActual.cantidad_reservada > 0 &&
    (!validacion.datos.controla_stock ||
      (validacion.datos.cantidad_stock ?? 0) < productoActual.cantidad_reservada)
  ) {
    return NextResponse.json(
      {
        error: `Hay ${productoActual.cantidad_reservada} unidad(es) reservada(s). No reduzcas las existencias por debajo de esa cantidad.`,
      },
      { status: 409 },
    );
  }

  const { data, error } = await contexto.supabase
    .from("productos")
    .update({
      ...validacion.datos,
      estado: estadoPorStock(
        validacion.datos.controla_stock,
        validacion.datos.cantidad_stock,
        productoActual.cantidad_reservada,
      ),
    })
    .eq("id", datos.id)
    .eq("negocio_id", contexto.negocio.id)
    .select(COLUMNAS_PRODUCTO)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "No se pudo actualizar el producto." }, { status: 404 });
  }
  return NextResponse.json({ producto: data });
}

export async function DELETE(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }
  const entrada = await leerJson(solicitud);
  const id =
    entrada.correcto &&
    typeof entrada.datos === "object" &&
    entrada.datos !== null &&
    "id" in entrada.datos
      ? entrada.datos.id
      : undefined;
  if (!esUuid(id)) {
    return NextResponse.json({ error: "El producto no es válido." }, { status: 400 });
  }

  const { data: producto, error: errorProducto } = await contexto.supabase
    .from("productos")
    .select("id")
    .eq("id", id)
    .eq("negocio_id", contexto.negocio.id)
    .is("eliminado_en", null)
    .maybeSingle();
  if (errorProducto || !producto) {
    return NextResponse.json({ error: "No se encontró el producto." }, { status: 404 });
  }

  /* Se marca en vez de borrarse, y las fotografías se conservan: recuperar un
     producto sin sus fotos no es recuperarlo. Se van juntas en la purga. */
  const { data, error } = await contexto.supabase
    .from("productos")
    .update({ eliminado_en: new Date().toISOString() })
    .eq("id", producto.id)
    .eq("negocio_id", contexto.negocio.id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "No se pudo borrar el producto." }, { status: 500 });
  }

  /* La limpieza viaja de a caballo con el borrado: es el momento en que el dueño
     ya está mirando su catálogo y una petición un poco más lenta no molesta. */
  await purgarPapeleraVencida(contexto.supabase, contexto.negocio.id);

  return NextResponse.json({ eliminado: true, enPapelera: true });
}
