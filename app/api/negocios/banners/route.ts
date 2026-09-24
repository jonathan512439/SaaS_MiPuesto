import {
  MENSAJE_SIN_ESPACIO,
  esRechazoPorEspacio,
  sinEspacioParaFotos,
} from "../../../../lib/catalogo/almacenamiento";
import { NextResponse, type NextRequest } from "next/server";

import { leerJson, obtenerContextoAdminCatalogo } from "../../../../lib/catalogo/servidor";
import { extensionPorTipo, validarImagenBinaria } from "../../../../lib/imagenes";
import {
  MAXIMO_BANNERS,
  leerBanners,
  validarBanners,
  type Banner,
} from "../../../../lib/negocios/banners";
import {
  leerTextoPortada,
  validarTextoPortada,
} from "../../../../lib/negocios/texto-sobre-imagen";

/* El cartel de la portada y el banner de publicidad.
 *
 * Sigue el camino de `/api/negocios/identidad`, que es el que ya sube el logo, la
 * portada y el QR: `POST` sube la imagen del banner y devuelve su ruta, `PATCH`
 * guarda el conjunto. No se reusa aquella ruta porque un banner no es solo una
 * imagen —lleva texto alternativo y a veces un enlace— y porque allá cada tipo
 * mapea a una columna.
 *
 * El `PATCH` guarda **las dos cosas juntas**: lo que va escrito sobre la
 * portada (`portada_texto`) y el banner (`banners`). Se editan en la misma
 * pantalla, con la misma vista previa, y se guardan con el mismo botón; dos
 * rutas serían dos pedidos para un solo «Guardar». El texto de la portada es
 * opcional en el cuerpo: quien no lo manda, no lo toca.
 */

const CARPETA = "banner";

/* El orden es `(ruta, negocioId)` y no al revés, que es como se lee en los dos
   llamados. Escrito al revés compilaba igual —los dos son `string`— y rechazaba
   todos los banners: el sistema de tipos no puede distinguir dos parámetros del
   mismo tipo, así que el orden lo tiene que sostener el nombre. */
function rutaDeBanner(ruta: string, negocioId: string) {
  return (
    ruta.startsWith(`${negocioId}/${CARPETA}/`) && !ruta.includes("..") && !ruta.includes("\\")
  );
}

/* Qué imágenes quedaron sin usar después de guardar.
 *
 * Se calcula comparando, y no borrando «la anterior de la posición N», porque el
 * dueño puede reordenarlos: si el banner de abajo pasa a ser el de arriba, su
 * imagen sigue en uso aunque haya cambiado de índice. Borrar por posición dejaría
 * el catálogo sin esa imagen. */
function imagenesHuerfanas(
  antes: Array<Banner | null>,
  despues: Array<Banner | null>,
  negocioId: string,
) {
  /* Los lugares vacios no tienen imagen, ni antes ni despues. */
  const enUso = new Set(despues.filter((b) => b !== null).map((banner) => banner.imagen));
  return antes
    .filter((banner) => banner !== null)
    .map((banner) => banner.imagen)
    .filter((ruta) => !enUso.has(ruta) && rutaDeBanner(ruta, negocioId));
}

export async function POST(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }

  let formulario: FormData;
  try {
    formulario = await solicitud.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer la imagen." }, { status: 400 });
  }

  const archivo = formulario.get("archivo");
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Selecciona una imagen." }, { status: 400 });
  }

  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const validacion = validarImagenBinaria(bytes);
  if (!validacion.correcto) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }

  /* La imagen se sube y se devuelve la ruta, sin tocar la columna. El banner se
     guarda recién en el `PATCH`, con su texto alternativo: una imagen vinculada
     sin texto sería un banner mudo, que es justo lo que el modelo no admite. */
  /* El espacio de fotos del negocio: si ya no hay lugar, se dice antes de
     subir y con palabras. La regla de la base lo hace cumplir igual. */
  if (await sinEspacioParaFotos(contexto.supabase, contexto.negocio.id)) {
    return NextResponse.json({ error: MENSAJE_SIN_ESPACIO }, { status: 409 });
  }
  const ruta = `${contexto.negocio.id}/${CARPETA}/${crypto.randomUUID()}.${extensionPorTipo(
    validacion.tipo,
  )}`;
  const { error: errorSubida } = await contexto.supabase.storage
    .from("negocios")
    .upload(ruta, bytes, {
      cacheControl: "31536000",
      contentType: validacion.tipo,
      upsert: false,
    });
  if (errorSubida) {
    if (esRechazoPorEspacio(errorSubida.message)) {
      return NextResponse.json({ error: MENSAJE_SIN_ESPACIO }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo subir la imagen." }, { status: 500 });
  }

  const { data: publica } = contexto.supabase.storage.from("negocios").getPublicUrl(ruta);
  return NextResponse.json({ ruta, url: publica.publicUrl }, { status: 201 });
}

export async function PATCH(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }

  const entrada = await leerJson(solicitud);
  if (!entrada.correcto) {
    return NextResponse.json({ error: entrada.error }, { status: 400 });
  }

  const cuerpo =
    typeof entrada.datos === "object" && entrada.datos !== null
      ? (entrada.datos as Record<string, unknown>)
      : {};
  const validacion = validarBanners("banners" in cuerpo ? cuerpo.banners : []);
  if (!validacion.correcto) {
    return NextResponse.json(
      { error: "Revisa el banner.", errores: validacion.errores },
      { status: 400 },
    );
  }
  /* `undefined` es «no lo toques»; un objeto es lo que va a quedar. */
  const portada = "portada" in cuerpo ? validarTextoPortada(cuerpo.portada) : null;
  if (portada && !portada.correcto) {
    return NextResponse.json(
      { error: "Revisa el texto de la portada.", errores: portada.errores },
      { status: 400 },
    );
  }

  /* Que la ruta sea de este negocio se comprueba acá y no en el validador: el
     validador es una función pura y no sabe de quién es la sesión. Sin esto, una
     petición armada a mano podría apuntar a la carpeta de otro negocio y mostrar
     su imagen en el catálogo propio. */
  const ajena = validacion.banners.find(
    (banner) => banner !== null && !rutaDeBanner(banner.imagen, contexto.negocio.id),
  );
  if (ajena) {
    return NextResponse.json(
      { error: "Una de las imágenes no pertenece a este negocio." },
      { status: 400 },
    );
  }

  const { data: actual, error: errorLectura } = await contexto.supabase
    .from("negocios")
    .select("banners")
    .eq("id", contexto.negocio.id)
    .eq("admin_user_id", contexto.idUsuario)
    .maybeSingle();
  if (errorLectura || !actual) {
    return NextResponse.json({ error: "No se pudo leer los banners actuales." }, { status: 500 });
  }

  const { data: guardado, error: errorGuardado } = await contexto.supabase
    .from("negocios")
    .update({
      banners: validacion.banners,
      ...(portada?.correcto ? { portada_texto: portada.texto } : {}),
    })
    .eq("id", contexto.negocio.id)
    .eq("admin_user_id", contexto.idUsuario)
    .select("banners,portada_texto")
    .maybeSingle();
  if (errorGuardado || !guardado) {
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }

  /* El archivo se borra **después** de guardar, y su fallo no revierte nada: un
     archivo huérfano ocupa unos kilobytes y no se ve, mientras que deshacer un
     guardado correcto le devolvería al dueño el banner viejo sin motivo. */
  const huerfanas = imagenesHuerfanas(
    leerBanners(actual.banners),
    validacion.banners,
    contexto.negocio.id,
  );
  if (huerfanas.length > 0) {
    await contexto.supabase.storage.from("negocios").remove(huerfanas);
  }

  return NextResponse.json({
    banners: leerBanners(guardado.banners),
    portada: leerTextoPortada(guardado.portada_texto),
    maximo: MAXIMO_BANNERS,
  });
}
