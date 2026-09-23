import { NextResponse, type NextRequest } from "next/server";

import { leerJson } from "../../../../lib/catalogo/servidor";
import { analizarArchivo } from "../../../../lib/ia/gemini";
import { informeDeCobertura, type CampoDeCategoria } from "../../../../lib/ia/cobertura";
import {
  INSTRUCCION_LISTA,
  categoriaQueEligio,
  categoriasParaElegir,
  esquemaLista,
  instruccionDeCamposDeCategoria,
  instruccionDeCategoriasDelNegocio,
  type ListaLeida,
} from "../../../../lib/ia/instrucciones";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import { TIPOS_LISTA, leerArchivoDeLaPeticion } from "../../../../lib/ia/archivos";
import {
  devolverCredito,
  leerCategoriasDelNegocio,
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

  /* Los campos que el negocio ya declaró en sus categorías: es «la categoría
     como esquema». El dueño definió alguna vez que sus repuestos tienen marca y
     modelo, y esa definición es la mejor pista que existe sobre qué mirar en
     cada renglón. Se leen antes de llamar al modelo porque viajan adentro de la
     instrucción.

     Si la consulta falla no se corta la lectura: la importación sin campos sigue
     sirviendo, y negarle al dueño su lista entera porque no pudimos leer una
     tabla auxiliar sería cambiar un problema chico por uno grande. */
  const [camposPorCategoria, categorias] = await Promise.all([
    leerCamposPorCategoria(preparacion.negocioId),
    leerCategoriasDelNegocio(preparacion.negocioId),
  ]);
  /* Las categorías que ya tiene el negocio viajan como lista cerrada: el modelo
     ubica cada renglón en la más parecida —«BEBIDAS» en «Refrescos»— o dice que
     ninguna corresponde. No gasta una lectura más: va en la misma consulta. */
  const nombresDeCategorias = categoriasParaElegir(categorias.map(({ nombre }) => nombre));

  const lectura = await analizarArchivo<ListaLeida>(
    INSTRUCCION_LISTA +
      instruccionDeCamposDeCategoria(camposPorCategoria) +
      instruccionDeCategoriasDelNegocio(nombresDeCategorias),
    esquemaLista(nombresDeCategorias),
    { base64: archivo.base64, tipo: archivo.tipo },
  );

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
    .map((producto) => {
      const titulo = (producto.categoria ?? "").trim().slice(0, 60);
      const sugerida = nombresDeCategorias.length
        ? categoriaQueEligio(producto.categoria_del_negocio, categorias)
        : null;
      return {
        nombre: (producto.nombre ?? "").trim().slice(0, 80),
        precio: Number(producto.precio),
        descripcion: (producto.descripcion ?? "").trim().slice(0, 300),
        /* La categoría sale del título de sección de la propia lista: esa lista
           ya trae la estructura del catálogo escrita por el dueño. Si el renglón
           no tiene título, se usa la categoría del negocio que eligió el modelo,
           y así el renglón llega agrupado bajo ella en vez de suelto. */
        categoria: titulo || sugerida?.nombre || "",
        /* La categoría del negocio más parecida, aunque el título no coincida.
           La pantalla de revisión la propone para toda la sección. */
        categoriaSugeridaId: sugerida?.id ?? null,
        confianza: producto.confianza ?? "baja",
        /* Solo las claves que la categoría declaró de verdad. El modelo puede
           devolver una clave inventada o la de otra categoría, y guardarla sería
           meterle al producto un campo que su categoría no tiene: el panel no
           sabría dibujarlo y el dueño no sabría de dónde salió. */
        datos: clavesValidas(
          producto.datos,
          camposPorCategoria.get(titulo.toLowerCase()) ??
            (sugerida ? camposPorCategoria.get(sugerida.nombre.trim().toLowerCase()) : undefined),
        ),
      };
    })
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

  /* Cuánto se pudo completar, dicho antes de que el dueño confirme. Si se
     enterara después, tendría que abrir los cuarenta productos uno por uno para
     descubrir a cuáles les falta la marca. */
  const cobertura = informeDeCobertura(productos, camposPorCategoria);

  return NextResponse.json({ productos, cobertura });
}

/* Los campos de cada categoría, indexados por el nombre de la categoría en
   minúsculas: es la misma llave con la que la pantalla de revisión decide que
   «BEBIDAS» de la lista es la categoría «Bebidas» que el negocio ya tiene. */
async function leerCamposPorCategoria(
  negocioId: string,
): Promise<Map<string, CampoDeCategoria[]>> {
  const mapa = new Map<string, CampoDeCategoria[]>();
  const supabase = await crearClienteSupabaseServidor();

  const { data, error } = await supabase
    .from("atributos_categoria")
    .select("clave,nombre,tipo,unidad,opciones,orden,categorias!inner(nombre,negocio_id)")
    .eq("negocio_id", negocioId)
    .order("orden");

  if (error || !data) return mapa;

  for (const fila of data) {
    const categoria = (fila.categorias as unknown as { nombre: string } | null)?.nombre;
    if (!categoria) continue;
    const clave = categoria.trim().toLowerCase();
    const actuales = mapa.get(clave) ?? [];
    actuales.push({
      clave: fila.clave,
      nombre: fila.nombre,
      tipo: fila.tipo,
      unidad: fila.unidad,
      opciones: fila.opciones ?? [],
    });
    mapa.set(clave, actuales);
  }

  return mapa;
}

/* Qué valores sobreviven, y por qué se descartan los demás.
 *
 * No alcanza con que la clave exista: el valor tiene que ser uno que la ruta de
 * productos vaya a aceptar. Un campo «Potencia» de tipo número recibiendo «500
 * W» hace que esa ruta rechace **el producto entero** con un 400, y el dueño ve
 * «no se pudo crear» en un producto que estaba perfecto. Una ayuda que rompe lo
 * que venía funcionando no es una ayuda.
 *
 * Así que acá se descarta lo que no encaja, en silencio y a propósito: el
 * informe de cobertura va a contarlo como faltante, que es exactamente lo que
 * es. «No lo pude leer» es una respuesta aceptable; «lo leí mal y te tumbé el
 * producto» no.
 */
function clavesValidas(
  datos: Array<{ clave: string; valor: string }> | undefined,
  campos: CampoDeCategoria[] | undefined,
): Array<{ clave: string; valor: string }> {
  if (!datos || !campos || campos.length === 0) return [];
  const porClave = new Map(campos.map((campo) => [campo.clave, campo]));

  return datos
    .map((dato) => {
      const campo = porClave.get(dato?.clave);
      if (!campo) return null;

      const valor = String(dato.valor ?? "").trim().slice(0, 120);
      if (valor === "") return null;

      if (campo.tipo === "numero") {
        /* «500 W» y «500» son lo mismo para quien lee la lista, pero el campo
           guarda un número. Se rescata el número si está al principio; si el
           renglón dice «media pulgada», no hay número y se descarta. */
        const numero = Number.parseFloat(valor.replace(",", "."));
        return Number.isFinite(numero) ? { clave: campo.clave, valor: String(numero) } : null;
      }

      if (campo.tipo === "opcion") {
        /* Solo si coincide con una de las opciones que el dueño escribió. El
           modelo devuelve «rojo» y la opción es «Rojo»: eso se acomoda. Una
           opción que no está en la lista se descarta, porque agregarla sería
           decidir por el dueño qué opciones tiene su campo. */
        const elegida = (campo.opciones ?? []).find(
          (opcion) => opcion.toLowerCase() === valor.toLowerCase(),
        );
        return elegida ? { clave: campo.clave, valor: elegida } : null;
      }

      /* `si_no` queda afuera: una lista de precios no dice si algo es sí o no, y
         un modelo que lo deduzca está inventando. */
      if (campo.tipo === "si_no") return null;

      return { clave: campo.clave, valor };
    })
    .filter((dato): dato is { clave: string; valor: string } => dato !== null);
}
