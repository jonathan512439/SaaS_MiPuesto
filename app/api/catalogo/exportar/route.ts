import { NextResponse } from "next/server";

import { obtenerContextoAdminCatalogo } from "../../../../lib/catalogo/servidor";
import {
  exportarCatalogo,
  nombreDeArchivo,
  type ProductoExportable,
} from "../../../../lib/exportacion/catalogo";

/* El catálogo del negocio, en una planilla que se descarga.
 *
 * Es `GET` y no `POST` a propósito: no cambia nada, y así el dueño la pide desde
 * un enlace común. Un botón que hace `fetch` y arma la descarga en el navegador
 * haría lo mismo con más partes que se pueden romper.
 *
 * **Es también la red de seguridad del cambio de rubro**, que vacía el catálogo:
 * esa operación exporta primero y no borra nada si la exportación falla. Por eso
 * el armado vive en `lib/exportacion/`, donde lo puede llamar el servidor sin
 * pasar por HTTP, y esta ruta es solo la puerta para el dueño.
 */
export async function GET() {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }

  const { supabase, negocio } = contexto;

  /* Las tres consultas, juntas. Las categorías y subcategorías vienen aparte y
     no con un `join` por producto porque son pocas y se repiten en cada fila:
     traerlas una vez y cruzarlas acá es una consulta chica en vez de arrastrar
     el nombre de la categoría trescientas veces. */
  const [productos, categorias, subcategorias] = await Promise.all([
    supabase
      .from("productos")
      .select(
        "codigo,nombre,descripcion,precio,categoria_id,subcategoria_id,controla_stock,cantidad_stock,visible",
      )
      .eq("negocio_id", negocio.id)
      /* Sin los de la papelera: lo que el dueño borró no es su catálogo. */
      .is("eliminado_en", null)
      .order("orden")
      .order("creado_en"),
    supabase.from("categorias").select("id,nombre").eq("negocio_id", negocio.id),
    supabase
      .from("subcategorias")
      .select("id,nombre,categorias!inner(negocio_id)")
      .eq("categorias.negocio_id", negocio.id),
  ]);

  /* Si algo falla, falla la exportación entera y se dice. Devolver media
     planilla sería peor que no devolver ninguna: el dueño guardaría un archivo
     incompleto creyendo que tiene su catálogo, y se enteraría el día que
     intentara recuperarlo. */
  if (productos.error || categorias.error || subcategorias.error) {
    return NextResponse.json(
      { error: "No se pudo leer tu catálogo para exportarlo." },
      { status: 500 },
    );
  }

  const nombreCategoria = new Map((categorias.data ?? []).map(({ id, nombre }) => [id, nombre]));
  const nombreSubcategoria = new Map(
    (subcategorias.data ?? []).map(({ id, nombre }) => [id, nombre]),
  );

  const exportables: ProductoExportable[] = (productos.data ?? []).map((producto) => ({
    codigo: producto.codigo,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    precio: Number(producto.precio),
    categoria: producto.categoria_id ? (nombreCategoria.get(producto.categoria_id) ?? null) : null,
    subcategoria: producto.subcategoria_id
      ? (nombreSubcategoria.get(producto.subcategoria_id) ?? null)
      : null,
    controla_stock: producto.controla_stock,
    cantidad_stock: producto.cantidad_stock,
    visible: producto.visible,
  }));

  const archivo = exportarCatalogo(exportables);

  return new NextResponse(archivo as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreDeArchivo(negocio.slug)}"`,
      /* Sin guardar: el catálogo cambia todos los días, y una copia cacheada
         haría que el dueño se descargue el de la semana pasada justo cuando
         necesita el de hoy. */
      "Cache-Control": "no-store",
    },
  });
}
