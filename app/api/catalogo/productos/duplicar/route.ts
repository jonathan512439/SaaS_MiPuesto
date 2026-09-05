import { NextResponse, type NextRequest } from "next/server";

import { LIMITE_PRODUCTOS, esUuid } from "../../../../../lib/catalogo/validacion";
import {
  leerJson,
  obtenerContextoAdminCatalogo,
} from "../../../../../lib/catalogo/servidor";
import { nombreDeCopia } from "../../../../../lib/catalogo/duplicado";

const COLUMNAS_PRODUCTO =
  "id,codigo,categoria_id,subcategoria_id,nombre,descripcion,precio,precio_anterior,precio_actualizado_en,precio_actualizado_por,fotos,controla_stock,cantidad_stock,cantidad_reservada,visible,estado,orden";

/* Duplicar existe porque media carga de catálogo son variantes del mismo
   artículo: la misma polera en tres tallas, el mismo plato en dos porciones.
   La copia nace oculta: es un borrador hasta que alguien la edite, y así una
   duplicación por error no aparece en el catálogo público. */
export async function POST(solicitud: NextRequest) {
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

  const { data: original, error: errorOriginal } = await contexto.supabase
    .from("productos")
    .select(
      "nombre,descripcion,precio,categoria_id,subcategoria_id,controla_stock,cantidad_stock,fotos,estado",
    )
    .eq("id", id)
    .eq("negocio_id", contexto.negocio.id)
    .maybeSingle();
  if (errorOriginal || !original) {
    return NextResponse.json({ error: "No se encontró el producto." }, { status: 404 });
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

  const { data: ultimo } = await contexto.supabase
    .from("productos")
    .select("orden")
    .eq("negocio_id", contexto.negocio.id)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: copia, error } = await contexto.supabase
    .from("productos")
    .insert({
      negocio_id: contexto.negocio.id,
      nombre: nombreDeCopia(original.nombre),
      descripcion: original.descripcion,
      precio: original.precio,
      categoria_id: original.categoria_id,
      subcategoria_id: original.subcategoria_id,
      controla_stock: original.controla_stock,
      cantidad_stock: original.cantidad_stock,
      cantidad_reservada: 0,
      estado: original.estado,
      visible: false,
      fotos: [],
      orden: (ultimo?.orden ?? 0) + 1,
    })
    .select(COLUMNAS_PRODUCTO)
    .single();
  if (error || !copia) {
    return NextResponse.json({ error: "No se pudo duplicar el producto." }, { status: 500 });
  }

  /* Las fotos se copian de verdad y no se comparte la ruta: borrar el original
     borra sus archivos del almacenamiento, y una copia que apunte a los mismos
     se quedaría sin imágenes sin que nadie entienda por qué. */
  const fotos: string[] = [];
  for (const rutaOriginal of original.fotos) {
    const extension = rutaOriginal.split(".").pop() ?? "webp";
    const destino = `${contexto.negocio.id}/${copia.id}/${crypto.randomUUID()}.${extension}`;
    const { error: errorCopia } = await contexto.supabase.storage
      .from("productos")
      .copy(rutaOriginal, destino);
    if (!errorCopia) fotos.push(destino);
  }

  if (fotos.length === 0) {
    return NextResponse.json({ producto: copia, fotosCopiadas: 0 }, { status: 201 });
  }

  const { data: conFotos } = await contexto.supabase
    .from("productos")
    .update({ fotos })
    .eq("id", copia.id)
    .eq("negocio_id", contexto.negocio.id)
    .select(COLUMNAS_PRODUCTO)
    .maybeSingle();

  return NextResponse.json(
    { producto: conFotos ?? copia, fotosCopiadas: fotos.length },
    { status: 201 },
  );
}
