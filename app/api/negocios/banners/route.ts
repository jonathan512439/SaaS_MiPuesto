import { NextResponse, type NextRequest } from "next/server";

import { leerJson, obtenerContextoAdminCatalogo } from "../../../../lib/catalogo/servidor";
import { extensionPorTipo, validarImagenBinaria } from "../../../../lib/imagenes";
import {
  MAXIMO_BANNERS,
  leerBanners,
  validarBanners,
  type Banner,
} from "../../../../lib/negocios/banners";

/* Los dos banners del catálogo.
 *
 * Sigue el camino de `/api/negocios/identidad`, que es el que ya sube el logo, la
 * portada y el QR: `POST` sube una imagen y devuelve su ruta, `PATCH` guarda el
 * conjunto. No se reusa aquella ruta porque un banner no es solo una imagen —
 * lleva texto alternativo y a veces un enlace— y porque allá cada tipo mapea a
 * una columna, mientras que acá los dos viven en un arreglo.
 *
 * **La posición es el índice**, y por eso el `PATCH` reemplaza el conjunto entero
 * en vez de parchear uno: mandar «el banner 2» cuando el 1 no existe dejaría un
 * hueco que el arreglo no puede representar.
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
function imagenesHuerfanas(antes: Banner[], despues: Banner[], negocioId: string) {
  const enUso = new Set(despues.map((banner) => banner.imagen));
  return antes
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

  const crudos =
    typeof entrada.datos === "object" && entrada.datos !== null && "banners" in entrada.datos
      ? entrada.datos.banners
      : [];
  const validacion = validarBanners(crudos);
  if (!validacion.correcto) {
    return NextResponse.json(
      { error: "Revisa los banners.", errores: validacion.errores },
      { status: 400 },
    );
  }

  /* Que la ruta sea de este negocio se comprueba acá y no en el validador: el
     validador es una función pura y no sabe de quién es la sesión. Sin esto, una
     petición armada a mano podría apuntar a la carpeta de otro negocio y mostrar
     su imagen en el catálogo propio. */
  const ajena = validacion.banners.find(
    (banner) => !rutaDeBanner(banner.imagen, contexto.negocio.id),
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
    .update({ banners: validacion.banners })
    .eq("id", contexto.negocio.id)
    .eq("admin_user_id", contexto.idUsuario)
    .select("banners")
    .maybeSingle();
  if (errorGuardado || !guardado) {
    return NextResponse.json({ error: "No se pudieron guardar los banners." }, { status: 500 });
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

  return NextResponse.json({ banners: leerBanners(guardado.banners), maximo: MAXIMO_BANNERS });
}
