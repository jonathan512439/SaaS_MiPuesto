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
  validarJerarquiaProducto,
} from "../../../../lib/catalogo/servidor";

const COLUMNAS_PRODUCTO =
  "id,codigo,categoria_id,subcategoria_id,nombre,descripcion,precio,fotos,controla_stock,cantidad_stock,cantidad_reservada,visible,estado,orden";

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
    .eq("negocio_id", contexto.negocio.id);
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
      .select(COLUMNAS_PRODUCTO)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "No se pudo cambiar la visibilidad." }, { status: 404 });
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
    .select("id,fotos")
    .eq("id", id)
    .eq("negocio_id", contexto.negocio.id)
    .maybeSingle();
  if (errorProducto || !producto) {
    return NextResponse.json({ error: "No se encontró el producto." }, { status: 404 });
  }
  if (producto.fotos.length > 0) {
    const { error: errorStorage } = await contexto.supabase.storage
      .from("productos")
      .remove(producto.fotos);
    if (errorStorage) {
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
  return NextResponse.json({ eliminado: true });
}
