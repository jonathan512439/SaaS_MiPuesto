import { NextResponse, type NextRequest } from "next/server";

import {
  leerJson,
  obtenerContextoAdminCatalogo,
} from "../../../../../../lib/catalogo/servidor";
import { esTipoPresentacion, validarVariantes } from "../../../../../../lib/catalogo/variantes";
import { esUuid } from "../../../../../../lib/catalogo/validacion";

/* Las presentaciones de un producto.
 *
 * `PUT` y no `PATCH` por presentación, por lo mismo que los campos de categoría:
 * dos de las reglas —el tope, sin nombres repetidos— son sobre el conjunto, y
 * el editor guarda todo junto. Desde la fase 13 lo guarda la base con
 * `guardar_presentaciones`, que conserva el identificador de cada una.
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

/* Los errores de `guardar_presentaciones`, dichos para el dueño. La base es la
   que decide —se puede escribir sin pasar por esta ruta—, y acá solo se
   traduce. */
const ERRORES_PRESENTACIONES: Record<string, { estado: number; mensaje: string }> = {
  PRESENTACION_RESERVADA: {
    estado: 409,
    mensaje:
      "Una de las presentaciones que sacaste tiene unidades apartadas en pedidos pendientes. Ocúltala en vez de borrarla, o espera a que se confirmen o venzan.",
  },
  PRODUCTO_RESERVADO: {
    estado: 409,
    mensaje:
      "Este producto tiene unidades apartadas en pedidos pendientes. Espera a que se confirmen o venzan antes de agregarle presentaciones.",
  },
  EXISTENCIAS_POR_PRESENTACION: {
    estado: 400,
    mensaje: "Este producto controla existencias: indica cuántas unidades hay de cada presentación.",
  },
  EXISTENCIAS_REQUERIDAS: {
    estado: 400,
    mensaje: "Sin presentaciones, el producto vuelve a llevar sus existencias: indica cuántas unidades hay.",
  },
  NUMERO_INVALIDO: {
    estado: 400,
    mensaje: "Los números de calzado van de 16 a 50, enteros o con medio: 38, 40,5.",
  },
  CATEGORIA_VENDE_TIEMPO: {
    estado: 400,
    mensaje: "Esta categoría vende tiempo, no cosas. Sus horarios se configuran en la agenda.",
  },
  variantes_nombre_unico: {
    estado: 400,
    mensaje: "Hay dos presentaciones que se llaman igual. Un 40 y un 40,0 son el mismo número.",
  },
  variantes_reserva_consistente: {
    estado: 409,
    mensaje:
      "No puedes dejar menos existencias que las unidades ya apartadas en pedidos pendientes.",
  },
  PRESENTACION_NO_ENCONTRADA: {
    estado: 409,
    mensaje: "Las presentaciones cambiaron mientras las editabas. Vuelve a abrir el producto.",
  },
};

function responderErrorDePresentaciones(mensaje: string) {
  const coincidencia = Object.entries(ERRORES_PRESENTACIONES).find(([codigo]) =>
    mensaje.includes(codigo),
  );
  return (
    coincidencia?.[1] ?? { estado: 500, mensaje: "No se pudieron guardar las presentaciones." }
  );
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
    .select("id,controla_stock,tipo_presentacion,categoria_id,categorias(vende)")
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
  const cuerpo =
    typeof entrada.datos === "object" && entrada.datos !== null
      ? (entrada.datos as Record<string, unknown>)
      : {};
  const crudas = "variantes" in cuerpo ? cuerpo.variantes : [];

  const categoria = producto.categorias as { vende?: string } | null;
  const validacion = validarVariantes(crudas, {
    controlaStock: producto.controla_stock === true,
    vendeTiempo: categoria?.vende === "tiempo",
  });
  if (!validacion.correcto) {
    return NextResponse.json(
      { error: "Revisa las presentaciones.", errores: validacion.errores },
      { status: 400 },
    );
  }

  /* El tipo viaja con las presentaciones desde el editor de la fase 13; el
     editor anterior no lo manda, y entonces se conserva el que tenía. */
  const tipo = esTipoPresentacion(cuerpo.tipo) ? cuerpo.tipo : producto.tipo_presentacion;
  const existenciasProducto =
    typeof cuerpo.existenciasProducto === "number" && Number.isInteger(cuerpo.existenciasProducto)
      ? cuerpo.existenciasProducto
      : null;

  /* Todo en una transacción, en la base: las que traen identificador se
     actualizan, las nuevas se crean y las que faltan se borran. Antes se
     borraban todas y se volvían a crear, y cada guardado les cambiaba el
     identificador, que es a lo que apuntan las reservas y los pedidos. */
  const { error } = await contexto.supabase.rpc("guardar_presentaciones", {
    p_producto_id: id,
    p_tipo: tipo,
    p_presentaciones: validacion.variantes.map((variante) => ({
      id: variante.id,
      nombre: variante.nombre,
      precio: variante.precio,
      cantidad_stock: variante.cantidadStock,
      visible: variante.visible,
    })),
    p_existencias_producto: existenciasProducto ?? undefined,
  });
  if (error) {
    const respuesta = responderErrorDePresentaciones(`${error.message} ${error.details ?? ""}`);
    return NextResponse.json({ error: respuesta.mensaje }, { status: respuesta.estado });
  }

  const { data, error: errorLectura } = await contexto.supabase
    .from("variantes_producto")
    .select(COLUMNAS)
    .eq("producto_id", id)
    .eq("negocio_id", contexto.negocio.id)
    .order("orden");
  if (errorLectura) {
    return NextResponse.json({ error: "No se pudieron leer las presentaciones." }, { status: 500 });
  }
  return NextResponse.json({ variantes: data, tipo });
}
