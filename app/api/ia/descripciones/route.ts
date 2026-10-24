import { NextResponse, type NextRequest } from "next/server";

import { leerJson } from "../../../../lib/catalogo/servidor";
import { analizarArchivo } from "../../../../lib/ia/gemini";
import {
  ESQUEMA_DESCRIPCIONES,
  MAXIMO_PARA_DESCRIBIR,
  descripcionesValidas,
  instruccionDescripciones,
  leerProductosParaDescribir,
} from "../../../../lib/ia/descripciones";
import { devolverCredito, prepararLecturaDeFoto, registrarLlamada } from "../../../../lib/ia/servidor";

/* Las descripciones de una planilla que no las trae.
 *
 * La foto y el PDF las escriben en la misma lectura; una planilla no pasa por
 * el modelo, así que esto es una lectura aparte y **gasta una del cupo**, con
 * los mismos controles que las otras dos: sesión, clave, función habilitada y
 * cupo del plan. Si algo falla después de reservarla, se devuelve.
 */
export async function POST(solicitud: NextRequest) {
  const preparacion = await prepararLecturaDeFoto();
  if (!preparacion.correcto) {
    return NextResponse.json({ error: preparacion.error }, { status: preparacion.estado });
  }

  const entrada = await leerJson(solicitud);
  const productos = entrada.correcto
    ? leerProductosParaDescribir((entrada.datos as { productos?: unknown } | null)?.productos)
    : null;
  if (!productos) {
    await devolverCredito(preparacion.admin, preparacion.negocioId);
    return NextResponse.json(
      { error: `Manda entre 1 y ${MAXIMO_PARA_DESCRIBIR} productos, cada uno con su nombre.` },
      { status: 400 },
    );
  }

  const lectura = await analizarArchivo<unknown>(
    instruccionDescripciones(productos),
    ESQUEMA_DESCRIPCIONES,
    null,
  );

  /* Se anota como «lista»: es parte de cargar un catálogo entero, y la base
     solo distingue la foto de un producto de la carga de muchos. */
  await registrarLlamada(
    preparacion.admin,
    preparacion.negocioId,
    "lista",
    lectura.correcto ? lectura.tokens : 0,
    lectura.correcto,
  );

  if (!lectura.correcto) {
    await devolverCredito(preparacion.admin, preparacion.negocioId);
    return NextResponse.json(
      { error: "No pudimos escribir las descripciones. Prueba de nuevo en un momento." },
      { status: 503 },
    );
  }

  const validas = descripcionesValidas(lectura.datos, productos.length);
  if (validas.size === 0) {
    await devolverCredito(preparacion.admin, preparacion.negocioId);
    return NextResponse.json(
      { error: "No pudimos escribir ninguna descripción con lo que dicen esos productos." },
      { status: 422 },
    );
  }

  return NextResponse.json({
    descripciones: [...validas].map(([indice, descripcion]) => ({ indice, descripcion })),
  });
}
