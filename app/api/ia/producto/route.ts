import { NextResponse, type NextRequest } from "next/server";

import { leerJson } from "../../../../lib/catalogo/servidor";
import { analizarArchivo } from "../../../../lib/ia/gemini";
import {
  categoriaQueEligio,
  categoriasParaElegir,
  esquemaProducto,
  instruccionProducto,
  type ProductoLeido,
} from "../../../../lib/ia/instrucciones";
import { TIPOS_FOTO, leerArchivoDeLaPeticion } from "../../../../lib/ia/archivos";
import {
  devolverCredito,
  leerCategoriasDelNegocio,
  prepararLecturaDeFoto,
  registrarLlamada,
} from "../../../../lib/ia/servidor";

/* Devuelve una propuesta, nunca guarda nada. El dueño ve los campos llenos en
 * el formulario y decide si los deja. Esa es la diferencia entre una ayuda y
 * una función que publica cosas que nadie escribió.
 */
export async function POST(solicitud: NextRequest) {
  const preparacion = await prepararLecturaDeFoto();
  if (!preparacion.correcto) {
    return NextResponse.json({ error: preparacion.error }, { status: preparacion.estado });
  }

  const entrada = await leerJson(solicitud);
  const foto = entrada.correcto ? leerArchivoDeLaPeticion(entrada.datos, TIPOS_FOTO) : null;
  if (!foto) {
    await devolverCredito(preparacion.admin, preparacion.negocioId);
    return NextResponse.json({ error: "La fotografía no es válida." }, { status: 400 });
  }

  /* Las categorías se leen acá, del negocio de la sesión, y no se aceptan del
     navegador: lo que llega en el pedido podría nombrar categorías de otro
     negocio o inventarlas. Si la consulta falla, la lectura sigue sin
     categorías: el nombre y la descripción valen igual. */
  const categorias = await leerCategoriasDelNegocio(preparacion.negocioId);
  const nombres = categoriasParaElegir(categorias.map(({ nombre }) => nombre));

  const lectura = await analizarArchivo<ProductoLeido>(
    instruccionProducto(nombres),
    esquemaProducto(nombres),
    { base64: foto.base64, tipo: foto.tipo },
  );

  await registrarLlamada(
    preparacion.admin,
    preparacion.negocioId,
    "producto",
    lectura.correcto ? lectura.tokens : 0,
    lectura.correcto,
  );

  if (!lectura.correcto) {
    await devolverCredito(preparacion.admin, preparacion.negocioId);
    return NextResponse.json(
      {
        error:
          lectura.motivo === "tardo_demasiado"
            ? "La lectura tardó demasiado. Probá con una foto más liviana."
            : "No pudimos leer la fotografía. Probá de nuevo en un momento.",
      },
      { status: 503 },
    );
  }

  /* Un nombre vacío es la forma en que el modelo dice «no sé qué es esto». Se
     trata como una lectura fallida y se devuelve el crédito: no se le cobra al
     dueño una respuesta que no le sirve. */
  const nombre = (lectura.datos.nombre ?? "").trim();
  if (!nombre) {
    await devolverCredito(preparacion.admin, preparacion.negocioId);
    return NextResponse.json(
      {
        error:
          "No reconocimos el producto en esa foto. Probá con una más cercana y con buena luz.",
      },
      { status: 422 },
    );
  }

  const elegida = nombres.length ? categoriaQueEligio(lectura.datos.categoria, categorias) : null;

  return NextResponse.json({
    propuesta: {
      nombre: nombre.slice(0, 80),
      descripcion: (lectura.datos.descripcion ?? "").trim().slice(0, 300),
      categoriaId: elegida?.id ?? null,
      categoria: elegida?.nombre ?? "",
      confianza: lectura.datos.confianza ?? "baja",
    },
  });
}

