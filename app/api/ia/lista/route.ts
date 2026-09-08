import { NextResponse, type NextRequest } from "next/server";

import { leerJson } from "../../../../lib/catalogo/servidor";
import { analizarArchivo } from "../../../../lib/ia/gemini";
import {
  ESQUEMA_LISTA,
  INSTRUCCION_LISTA,
  type ListaLeida,
} from "../../../../lib/ia/instrucciones";
import { TIPOS_LISTA, leerArchivoDeLaPeticion } from "../../../../lib/ia/archivos";
import {
  devolverCredito,
  prepararLecturaDeFoto,
  registrarLlamada,
} from "../../../../lib/ia/servidor";

/* Tope por foto. Una lista con más de cien renglones legibles no existe en un
 * puesto de mercado; un número más alto solo aparecería si el modelo empezó a
 * inventar, y en ese caso conviene cortar antes de mostrárselo a nadie.
 */
const MAXIMO_PRODUCTOS = 100;

export async function POST(solicitud: NextRequest) {
  const preparacion = await prepararLecturaDeFoto();
  if (!preparacion.correcto) {
    return NextResponse.json({ error: preparacion.error }, { status: preparacion.estado });
  }

  const entrada = await leerJson(solicitud);
  const archivo = entrada.correcto ? leerArchivoDeLaPeticion(entrada.datos, TIPOS_LISTA) : null;
  if (!archivo) {
    await devolverCredito(preparacion.admin, preparacion.negocioId);
    return NextResponse.json(
      { error: "El archivo no es válido. Aceptamos una foto o un PDF de hasta 4 MB." },
      { status: 400 },
    );
  }

  const lectura = await analizarArchivo<ListaLeida>(INSTRUCCION_LISTA, ESQUEMA_LISTA, {
    base64: archivo.base64,
    tipo: archivo.tipo,
  });

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
      {
        error:
          lectura.motivo === "tardo_demasiado"
            ? "La lectura tardó demasiado. Si es un PDF largo, subilo por partes; si es una foto, fotografiá media hoja por vez."
            : "No pudimos leer el archivo. Probá de nuevo en un momento.",
      },
      { status: 503 },
    );
  }

  /* Decirle «esto no parece una lista de precios» es mejor que devolverle una
     invención sobre la foto de su estantería. */
  if (!lectura.datos.es_lista_de_precios) {
    await devolverCredito(preparacion.admin, preparacion.negocioId);
    return NextResponse.json(
      {
        error:
          "Eso no parece una lista de precios. Necesitamos la lista escrita, con el nombre y el precio en el mismo renglón.",
      },
      { status: 422 },
    );
  }

  const productos = (lectura.datos.productos ?? [])
    .map((producto) => ({
      nombre: (producto.nombre ?? "").trim().slice(0, 80),
      precio: Number(producto.precio),
      descripcion: (producto.descripcion ?? "").trim().slice(0, 300),
      /* La categoría sale del título de sección de la propia lista. Antes se
         descartaba, y era un desperdicio: esa lista ya trae la estructura del
         catálogo escrita por el dueño, y le pedíamos que la volviera a armar. */
      categoria: (producto.categoria ?? "").trim().slice(0, 60),
      confianza: producto.confianza ?? "baja",
    }))
    /* Se descarta acá lo que la base rechazaría igual, pero con la ventaja de
       que el dueño nunca ve un renglón que no podría guardar. */
    .filter(
      (producto) =>
        producto.nombre.length > 0 &&
        Number.isFinite(producto.precio) &&
        producto.precio > 0 &&
        producto.precio <= 99999,
    )
    .slice(0, MAXIMO_PRODUCTOS);

  if (productos.length === 0) {
    await devolverCredito(preparacion.admin, preparacion.negocioId);
    return NextResponse.json(
      {
        error:
          "No pudimos leer ningún producto. Si es una foto, probá con más luz, más cerca y con la lista derecha.",
      },
      { status: 422 },
    );
  }

  return NextResponse.json({ productos });
}
