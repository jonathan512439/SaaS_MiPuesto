import { NextResponse, type NextRequest } from "next/server";

import { validarAtributos, type Atributo } from "../../../../../../lib/catalogo/atributos";
import {
  leerJson,
  obtenerContextoAdminCatalogo,
} from "../../../../../../lib/catalogo/servidor";
import { esUuid } from "../../../../../../lib/catalogo/validacion";

/* Los campos que declara una categoría.
 *
 * `PUT` y no `PATCH` por campo: **el conjunto es la unidad**. Tres de las reglas
 * —hasta diez, hasta seis en la tarjeta, sin nombres repetidos— son sobre el
 * conjunto, y una petición por campo no puede comprobar ninguna. Además así el
 * servidor ve qué claves desaparecieron y puede decidir qué hacer con los valores
 * que las usaban, en vez de dejarlos como basura invisible.
 */

const COLUMNAS =
  "id,clave,nombre,tipo,unidad,opciones,obligatorio,en_tarjeta,en_resumen,orden" as const;

type FilaAtributo = {
  clave: string;
  nombre: string;
  tipo: string;
  unidad: string | null;
  opciones: string[];
  obligatorio: boolean;
  en_tarjeta: boolean;
  en_resumen: boolean;
  orden: number;
};

function aFila(atributo: Atributo, orden: number) {
  return {
    clave: atributo.clave,
    nombre: atributo.nombre,
    tipo: atributo.tipo,
    unidad: atributo.unidad,
    opciones: atributo.opciones,
    obligatorio: atributo.obligatorio,
    en_tarjeta: atributo.enTarjeta,
    en_resumen: atributo.enResumen,
    orden,
  };
}

/* Que la categoría sea de este negocio se comprueba acá y no en el validador: el
   validador es puro y no sabe de quién es la sesión. Sin esto, una petición
   armada a mano podría escribirle campos a la categoría de otro. */
async function categoriaPropia(
  contexto: Awaited<ReturnType<typeof obtenerContextoAdminCatalogo>> & { correcto: true },
  categoriaId: string,
) {
  const { data } = await contexto.supabase
    .from("categorias")
    .select("id")
    .eq("id", categoriaId)
    .eq("negocio_id", contexto.negocio.id)
    .maybeSingle();
  return data !== null;
}

/* En cuántos productos está cargado cada campo.
 *
 * Es lo que hace honesto el aviso al borrar: «el campo Casquillo tiene valor en
 * 23 productos». Sin el número, el aviso sería una advertencia genérica que el
 * dueño aprende a ignorar.
 *
 * Se cuenta trayendo la columna y contando acá, en vez de una consulta por campo
 * con el índice `gin`. Son diez campos como mucho, así que serían diez viajes
 * contra uno; y una categoría de un negocio de barrio tiene decenas de
 * productos, no millones. Si algún día un catálogo crece hasta que esto moleste,
 * la salida es una función en la base que devuelva las cuentas de una, no
 * partirlo en diez consultas. */
async function contarUsos(
  contexto: Awaited<ReturnType<typeof obtenerContextoAdminCatalogo>> & { correcto: true },
  categoriaId: string,
): Promise<Record<string, number>> {
  const { data } = await contexto.supabase
    .from("productos")
    .select("atributos")
    .eq("categoria_id", categoriaId)
    .eq("negocio_id", contexto.negocio.id);

  const usos: Record<string, number> = {};
  for (const fila of data ?? []) {
    const valores = fila.atributos;
    if (typeof valores !== "object" || valores === null || Array.isArray(valores)) continue;
    for (const [clave, valor] of Object.entries(valores)) {
      /* Un campo presente pero vacío no cuenta como cargado: borrarlo no le
         quita nada a nadie, y contarlo inflaría el aviso. */
      if (valor === null || valor === undefined || valor === "") continue;
      usos[clave] = (usos[clave] ?? 0) + 1;
    }
  }
  return usos;
}

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
    return NextResponse.json({ error: "La categoría no es válida." }, { status: 400 });
  }

  const { data, error } = await contexto.supabase
    .from("atributos_categoria")
    .select(COLUMNAS)
    .eq("categoria_id", id)
    .eq("negocio_id", contexto.negocio.id)
    .order("orden");
  if (error) {
    return NextResponse.json({ error: "No se pudieron leer los campos." }, { status: 500 });
  }

  return NextResponse.json({ atributos: data, usos: await contarUsos(contexto, id) });
}

export async function PUT(solicitud: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }
  const { id } = await params;
  if (!esUuid(id)) {
    return NextResponse.json({ error: "La categoría no es válida." }, { status: 400 });
  }
  if (!(await categoriaPropia(contexto, id))) {
    return NextResponse.json({ error: "La categoría no es válida." }, { status: 404 });
  }

  const entrada = await leerJson(solicitud);
  if (!entrada.correcto) {
    return NextResponse.json({ error: entrada.error }, { status: 400 });
  }
  const crudos =
    typeof entrada.datos === "object" && entrada.datos !== null && "atributos" in entrada.datos
      ? entrada.datos.atributos
      : [];

  const validacion = validarAtributos(crudos);
  if (!validacion.correcto) {
    return NextResponse.json(
      { error: "Revisá los campos.", errores: validacion.errores },
      { status: 400 },
    );
  }

  const { data: antes, error: errorLectura } = await contexto.supabase
    .from("atributos_categoria")
    .select("clave")
    .eq("categoria_id", id)
    .eq("negocio_id", contexto.negocio.id);
  if (errorLectura) {
    return NextResponse.json({ error: "No se pudieron leer los campos." }, { status: 500 });
  }

  /* **Se borra primero y se inserta después**, y el orden no es casual: el
     disparador `atributos_dentro_del_tope` cuenta las filas que hay en ese
     momento. Insertando antes, un reemplazo legítimo —borrar tres y agregar
     cuatro— pasaría por un estado con once campos y sería rechazado. La
     migración dice lo mismo del otro lado. */
  const { error: errorBorrado } = await contexto.supabase
    .from("atributos_categoria")
    .delete()
    .eq("categoria_id", id)
    .eq("negocio_id", contexto.negocio.id);
  if (errorBorrado) {
    return NextResponse.json({ error: "No se pudieron guardar los campos." }, { status: 500 });
  }

  if (validacion.atributos.length > 0) {
    const { error: errorInsercion } = await contexto.supabase.from("atributos_categoria").insert(
      validacion.atributos.map((atributo, indice) => ({
        ...aFila(atributo, indice),
        categoria_id: id,
        negocio_id: contexto.negocio.id,
      })),
    );
    if (errorInsercion) {
      /* El borrado ya ocurrió y no hay transacción que lo deshaga. Se avisa con
         lo que de verdad pasó en vez de un «no se pudo guardar» que dejaría al
         dueño creyendo que sus campos siguen ahí. */
      return NextResponse.json(
        {
          error:
            "No se pudieron guardar los campos y los anteriores se perdieron. Volvé a cargarlos.",
        },
        { status: 500 },
      );
    }
  }

  /* Las claves que desaparecieron dejan valores huérfanos en los productos. No
     se borran acá: el editor ya le preguntó al dueño con el conteo en la mano, y
     limpiar el dato es un paso aparte —`DELETE`— que él confirma. Se informan
     para que la pantalla pueda decir qué quedó suelto. */
  const clavesAntes = new Set((antes ?? []).map((fila) => fila.clave));
  const clavesAhora = new Set(validacion.atributos.map((atributo) => atributo.clave));
  const quitadas = [...clavesAntes].filter((clave) => !clavesAhora.has(clave));

  const { data, error } = await contexto.supabase
    .from("atributos_categoria")
    .select(COLUMNAS)
    .eq("categoria_id", id)
    .eq("negocio_id", contexto.negocio.id)
    .order("orden");
  if (error) {
    return NextResponse.json({ error: "No se pudieron leer los campos." }, { status: 500 });
  }

  return NextResponse.json({ atributos: data as FilaAtributo[], quitadas });
}
