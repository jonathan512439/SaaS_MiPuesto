import { NextResponse, type NextRequest } from "next/server";

import { esUuid } from "../../../../../../lib/catalogo/validacion";
import {
  exportarCatalogo,
  nombreDeArchivo,
  type ProductoExportable,
} from "../../../../../../lib/exportacion/catalogo";
import { esRubroId } from "../../../../../../lib/negocios/rubros";
import { RUBRO_PUBLICO_POR_SIEMBRA } from "../../../../../../lib/negocios/rubros-publicos";
import { armarSiembra } from "../../../../../../lib/rubros/sembrar";
import { crearClienteSupabaseServidor } from "../../../../../../lib/supabase/server";

/* Cambiar el rubro de un negocio: la única salida para quien se equivocó al
 * registrarse o cambió de giro.
 *
 * **La respuesta es la planilla**, y eso no es un capricho de formato: es lo que
 * hace cumplir la regla. El catálogo se exporta **antes** de tocar nada, y si la
 * exportación falla no se borra nada; si el dueño recibió el archivo, es porque
 * el archivo existía antes del borrado. Un endpoint que devolviera «listo» y
 * dejara la copia en otro lado tendría dos cosas que pueden fallar por separado,
 * y la que importa —la copia— es la que nadie miraría hasta necesitarla.
 *
 * La autorización no se comprueba acá: la exige `admin_cambiar_rubro`, como el
 * resto de las acciones de plataforma. Repetirla daría una segunda fuente de
 * verdad que puede quedar desincronizada.
 *
 * Lo que la planilla **no** salva —los campos de cada categoría, las
 * presentaciones, las fotografías y las citas agendadas— tiene que decirlo la
 * pantalla que llama a esto, antes de llamarla.
 */
export async function POST(
  solicitud: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  if (!datosClaims?.claims.sub) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }

  if (!esUuid(id)) {
    return NextResponse.json({ error: "El negocio no es válido." }, { status: 400 });
  }

  let entrada: unknown;
  try {
    entrada = await solicitud.json();
  } catch {
    return NextResponse.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
  }

  const rubro = (entrada as { rubro?: unknown })?.rubro;
  if (typeof rubro !== "string" || !esRubroId(rubro)) {
    return NextResponse.json({ error: "Ese rubro no existe." }, { status: 400 });
  }

  /* ── 1. La copia, antes que nada ──────────────────────────────────────────
     Se lee el catálogo con la sesión del administrador de plataforma. Si no
     puede leerlo, no puede salvarlo, y entonces no se borra: es exactamente la
     regla que esta operación tiene que cumplir. */
  const [negocio, productos, categorias, subcategorias] = await Promise.all([
    supabase.from("negocios").select("id,slug,nombre,rubro").eq("id", id).maybeSingle(),
    supabase
      .from("productos")
      .select(
        "codigo,nombre,descripcion,precio,categoria_id,subcategoria_id,controla_stock,cantidad_stock,visible",
      )
      .eq("negocio_id", id)
      .is("eliminado_en", null)
      .order("orden")
      .order("creado_en"),
    supabase.from("categorias").select("id,nombre").eq("negocio_id", id),
    supabase
      .from("subcategorias")
      .select("id,nombre,categorias!inner(negocio_id)")
      .eq("categorias.negocio_id", id),
  ]);

  if (negocio.error || !negocio.data) {
    return NextResponse.json({ error: "Ese negocio no existe." }, { status: 404 });
  }

  if (productos.error || categorias.error || subcategorias.error) {
    return NextResponse.json(
      {
        error:
          "No se pudo leer el catálogo para respaldarlo. No se cambió nada: sin copia no se borra.",
      },
      { status: 500 },
    );
  }

  const nombreCategoria = new Map((categorias.data ?? []).map(({ id: c, nombre }) => [c, nombre]));
  const nombreSubcategoria = new Map(
    (subcategorias.data ?? []).map(({ id: sc, nombre }) => [sc, nombre]),
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

  let archivo: Uint8Array;
  try {
    archivo = exportarCatalogo(exportables);
  } catch {
    return NextResponse.json(
      { error: "No se pudo armar la planilla de respaldo. No se cambió nada." },
      { status: 500 },
    );
  }

  /* ── 2. Recién ahora, el cambio ───────────────────────────────────────────
     La función de la base exige ser administrador de plataforma, borra y siembra
     en una sola transacción, y anota en la bitácora qué se destruyó. La siembra
     viaja armada desde acá: las listas viven en TypeScript y no se copian a SQL. */
  const { data: resultado, error } = await supabase.rpc("admin_cambiar_rubro", {
    p_negocio_id: id,
    p_rubro: rubro,
    p_siembra: armarSiembra(rubro) ?? undefined,
  });

  if (error) {
    const conocidos: Record<string, string> = {
      NEGOCIO_NO_ENCONTRADO: "Ese negocio no existe.",
      RUBRO_VACIO: "Ese rubro no existe.",
      MISMO_RUBRO: "El negocio ya está en ese rubro. No se cambió nada.",
      NO_AUTORIZADO: "No tenés permiso para cambiar el rubro de un negocio.",
    };
    const mensaje = Object.entries(conocidos).find(([clave]) => error.message.includes(clave))?.[1];
    return NextResponse.json(
      { error: mensaje ?? "No se pudo cambiar el rubro. No se cambió nada." },
      { status: mensaje ? 400 : 500 },
    );
  }

  /* El rubro público sigue a la siembra nueva: el que tenía era de otro tipo
     de catálogo —una «Pollería» que ahora es ferretería— y el buscador lo
     mostraría donde no va. Queda el general del tipo nuevo, y se afina después
     con «Rubro público» si el comerciante lo pide. Si esto fallara, el cambio de
     siembra ya está hecho y no se deshace por una etiqueta: se avisa en el
     registro y se corrige a mano. */
  const { error: errorPublico } = await supabase.rpc("admin_cambiar_rubro_publico", {
    p_negocio_id: id,
    p_rubro_publico: RUBRO_PUBLICO_POR_SIEMBRA[rubro],
  });
  if (errorPublico) {
    console.error("rubro: la siembra cambió y el rubro público no", errorPublico.message);
  }

  /* El resumen viaja en una cabecera y no en el cuerpo porque el cuerpo es la
     planilla. Quien llama lo lee para decir en pantalla qué se borró y qué se
     sembró, en números. */
  return new NextResponse(archivo as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreDeArchivo(`${negocio.data.slug}-antes-de-${rubro}`)}"`,
      "X-Resumen": JSON.stringify(resultado),
      "Cache-Control": "no-store",
    },
  });
}
