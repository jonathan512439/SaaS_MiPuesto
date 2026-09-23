import { NextResponse, type NextRequest } from "next/server";

import {
  LIMITE_PRODUCTOS,
  esUuid,
  estadoPorStock,
  validarProducto,
} from "../../../../lib/catalogo/validacion";
import { fechaHoyBolivia } from "../../../../lib/catalogo/carta-del-dia";
import { leerAtributos } from "../../../../lib/catalogo/atributos";
import { validarValores, type ValorAtributo } from "../../../../lib/catalogo/valores";
import {
  leerJson,
  obtenerContextoAdminCatalogo,
  purgarPapeleraVencida,
  validarJerarquiaProducto,
} from "../../../../lib/catalogo/servidor";
import { COLUMNAS_PRODUCTO_ADMIN } from "../../../../lib/catalogo/columnas";


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
    validacion.datos.recurso_id,
  );
  if (errorJerarquia) return NextResponse.json({ error: errorJerarquia }, { status: 400 });

  const atributos = await validarAtributosDelProducto(
    contexto,
    validacion.datos.categoria_id,
    (entrada.datos as Record<string, unknown>).atributos,
  );
  if (!atributos.correcto) {
    return NextResponse.json(
      { error: "Revisa los datos del producto.", errores: atributos.errores },
      { status: 400 },
    );
  }

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
      atributos: atributos.valores,
      negocio_id: contexto.negocio.id,
      estado: estadoPorStock(
        validacion.datos.controla_stock,
        validacion.datos.cantidad_stock,
        0,
      ),
      orden: (ultimo?.orden ?? 0) + 1,
    })
    .select(COLUMNAS_PRODUCTO_ADMIN)
    .single();
  if (error) {
    return NextResponse.json({ error: "No se pudo crear el producto." }, { status: 500 });
  }

  return NextResponse.json({ producto: data }, { status: 201 });
}

/* Los valores de los campos propios, comprobados contra las definiciones de su
   categoría.
 *
 * Se valida en el servidor y no solo en el formulario porque el formulario no es
 * el único que escribe: la importación desde Excel y lo que devuelve la IA pasan
 * por acá también. Y porque una petición armada a mano podría guardar un
 * casquillo que no existe, que después la ficha no sabría dibujar.
 *
 * Sin categoría no hay campos, así que lo que venga se descarta: los campos son
 * de la categoría, no del producto. */
async function validarAtributosDelProducto(
  contexto: Awaited<ReturnType<typeof obtenerContextoAdminCatalogo>> & { correcto: true },
  categoriaId: string | null,
  crudos: unknown,
): Promise<
  { correcto: true; valores: Record<string, ValorAtributo> } | { correcto: false; errores: Record<string, string> }
> {
  if (!categoriaId) return { correcto: true, valores: {} };

  const { data } = await contexto.supabase
    .from("atributos_categoria")
    .select("clave,nombre,tipo,unidad,opciones,obligatorio,en_tarjeta,en_resumen")
    .eq("categoria_id", categoriaId)
    .eq("negocio_id", contexto.negocio.id)
    .order("orden");

  return validarValores(leerAtributos(data ?? []), crudos);
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
      .select(COLUMNAS_PRODUCTO_ADMIN)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "No se pudo cambiar la visibilidad." }, { status: 404 });
    }
    return NextResponse.json({ producto: data });
  }

  /* La carta del día se arma y se deshace en un toque, varias veces por semana.
     Se guarda la fecha de hoy en Bolivia y no un sí/no: así se vacía sola a la
     medianoche y nadie tiene que acordarse de apagarla. */
  if (
    typeof datos.en_carta === "boolean" &&
    Object.keys(datos).every((clave) => clave === "id" || clave === "en_carta")
  ) {
    const { data, error } = await contexto.supabase
      .from("productos")
      .update({ en_carta_hasta: datos.en_carta ? fechaHoyBolivia() : null })
      .eq("id", datos.id)
      .eq("negocio_id", contexto.negocio.id)
      .is("eliminado_en", null)
      .select(COLUMNAS_PRODUCTO_ADMIN)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "No se pudo cambiar la carta del día." }, { status: 404 });
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
      .select("controla_stock,cantidad_stock,cantidad_reservada,con_presentaciones")
      .eq("id", datos.id)
      .eq("negocio_id", contexto.negocio.id)
      .is("eliminado_en", null)
      .maybeSingle();
    if (!actual) {
      return NextResponse.json({ error: "No se encontró el producto." }, { status: 404 });
    }

    /* Con existencias por presentación, el producto no tiene las suyas: ponerle
       cero no significa nada y la base lo descartaría. Se agota talla por talla,
       o se oculta el producto. */
    if (actual.controla_stock && actual.con_presentaciones) {
      return NextResponse.json(
        {
          error:
            "Este producto lleva existencias por presentación. Cámbialas en cada talla, número o tamaño.",
        },
        { status: 409 },
      );
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
      .select(COLUMNAS_PRODUCTO_ADMIN)
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
    validacion.datos.recurso_id,
  );
  if (errorJerarquia) return NextResponse.json({ error: errorJerarquia }, { status: 400 });

  const atributos = await validarAtributosDelProducto(
    contexto,
    validacion.datos.categoria_id,
    datos.atributos,
  );
  if (!atributos.correcto) {
    return NextResponse.json(
      { error: "Revisa los datos del producto.", errores: atributos.errores },
      { status: 400 },
    );
  }

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
      /* Se reemplaza el conjunto entero, no se mezcla con lo que había: si el
         producto cambió de categoría, los valores viejos no corresponden a
         ningún campo y quedarían escondidos adentro de la columna. */
      atributos: atributos.valores,
      estado: estadoPorStock(
        validacion.datos.controla_stock,
        validacion.datos.cantidad_stock,
        productoActual.cantidad_reservada,
      ),
    })
    .eq("id", datos.id)
    .eq("negocio_id", contexto.negocio.id)
    .select(COLUMNAS_PRODUCTO_ADMIN)
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
