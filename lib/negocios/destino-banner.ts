import { obtenerUrlBaseSitio } from "../url-sitio";
import { construirEnlaceWhatsapp, normalizarTelefonoWhatsappPublico } from "../whatsapp";

/* A dónde lleva un banner, dicho en lugares y no en direcciones.
 *
 * El banner guarda una URL, y eso no cambia: el catálogo la pone en un `href` y
 * no tiene por qué saber de dónde salió. Lo que cambia es **cómo se elige**.
 *
 * Pedirle una dirección escrita a mano a un comerciante es pedirle que falle: no
 * sabe que tiene que empezar con `https://`, no conoce el ancla de su categoría,
 * y si se equivoca el banner queda mudo sin decir por qué. Los destinos que el
 * sistema ya conoce —una categoría, su WhatsApp, su ubicación— se arman solos.
 *
 * Escribir una dirección sigue estando, pero como última opción y no como la
 * única.
 */

export type DestinoBanner =
  | { tipo: "ninguno" }
  /* Baja a los productos. Es lo que hacia el boton fijo de la portada —«Ver
     productos»— antes de que el texto de la portada fuera del dueño: ahora lo
     elige el, con el rotulo que quiera. */
  | { tipo: "productos" }
  | { tipo: "categoria"; categoriaId: string }
  /* La ficha de un producto: «2x1 en hamburguesas» lleva a la hamburguesa. */
  | { tipo: "producto"; codigo: string }
  | { tipo: "whatsapp" }
  | { tipo: "ubicacion" }
  | { tipo: "otra"; url: string };

export type ContextoDestino = {
  /* La dirección del catálogo, ya armada por quien conoce el dominio. */
  urlCatalogo: string;
  telefonoWhatsapp: string;
  ubicacionUrl: string | null;
  categorias: ReadonlyArray<{ id: string; nombre: string }>;
  productos: ReadonlyArray<{ codigo: string; nombre: string }>;
};

/* Las anclas que dibuja la plantilla. Si alguna vez cambian allá, esto queda
   apuntando a un lugar que no existe y el banner lleva al principio del
   catálogo: molesto, pero no roto. */
const ANCLA_PRODUCTOS = "#productos";
/* El formato viejo de «una categoría»: un ancla dentro de la página. Fallaba
   cuando la categoría no estaba en la primera página del catálogo —los
   productos se cargan de a tramos—, porque el ancla no existía y el botón no
   llevaba a ninguna parte. Se sigue reconociendo para los banners guardados
   así. */
const ANCLA_CATEGORIA = "#categoria-";

/* La categoría por el filtro del catálogo, que vive en la dirección: carga esa
   categoría entera, esté en la página que esté, y baja a los productos. */
function enlaceDeCategoria(urlCatalogo: string, categoriaId: string): string {
  return `${urlCatalogo}?categoria=${encodeURIComponent(categoriaId)}${ANCLA_PRODUCTOS}`;
}

function enlaceDeProducto(urlCatalogo: string, codigo: string): string {
  return `${urlCatalogo}/p/${encodeURIComponent(codigo)}`;
}

/* Si el enlace se queda dentro del catálogo, devuelve la dirección relativa
 * para seguirlo en la misma pestaña.
 *
 * Un destino «una categoría», «un producto» o «mis productos» se guarda como
 * una dirección completa, para que el dato sea una URL como cualquier otra.
 * Pero al dibujarla, la dirección completa abría **una pestaña nueva del mismo
 * catálogo** —el banner y la portada abren aparte lo que sale del negocio—, e
 * ir a una categoría o a un producto no es salir. Solo cuenta como propio lo
 * que está en el dominio del sitio: una dirección ajena con la misma forma no
 * se toca.
 */
export function destinoEnElCatalogo(
  enlace: string | null,
  base: string = obtenerUrlBaseSitio(),
): string | null {
  if (!enlace) return null;
  let url: URL;
  try {
    url = new URL(enlace);
  } catch {
    return null;
  }
  if (url.origin !== base) return null;

  const categoria =
    url.searchParams.get("categoria") ??
    (url.hash.startsWith(ANCLA_CATEGORIA) ? decodeURIComponent(url.hash.slice(ANCLA_CATEGORIA.length)) : null);
  if (categoria) {
    return `${url.pathname}?categoria=${encodeURIComponent(categoria)}${ANCLA_PRODUCTOS}`;
  }
  if (/^\/[^/]+\/p\/[^/]+\/?$/.test(url.pathname)) return url.pathname;
  if (url.hash === ANCLA_PRODUCTOS && url.search === "") return ANCLA_PRODUCTOS;
  return null;
}

/* El mensaje que acompaña al WhatsApp de un banner: qué promoción vio.
 *
 * Sin él, el cliente abría una conversación en blanco y el negocio no sabía
 * por qué anuncio le escribía. Se arma al dibujar, con el texto que el banner
 * muestra en ese momento: si el dueño cambia el título, el mensaje lo sigue, y
 * los banners guardados antes también lo llevan. */
export function mensajeDePromocion(texto: {
  titulo?: string | null;
  eyebrow?: string | null;
  copy?: string | null;
}): string {
  const titulo = texto.titulo?.trim() || texto.eyebrow?.trim() || texto.copy?.trim();
  return titulo
    ? `Hola, vi en tu catálogo la promoción «${titulo}». ¿Me das más información?`
    : "Hola, vi un anuncio en tu catálogo. ¿Me das más información?";
}

/* El enlace de WhatsApp de un banner, con el mensaje de la promoción. Un
   enlace que ya trae su propio mensaje —escrito a mano como «otra dirección»—
   se respeta. */
export function whatsappConPromocion(
  enlace: string | null,
  texto: Parameters<typeof mensajeDePromocion>[0],
): string | null {
  if (!enlace) return null;
  const coincidencia = /^https:\/\/wa\.me\/(\d+)\/?$/.exec(enlace.trim());
  if (!coincidencia) return null;
  return construirEnlaceWhatsapp(coincidencia[1], mensajeDePromocion(texto));
}

function enlaceDeWhatsapp(telefono: string): string {
  return `https://wa.me/${normalizarTelefonoWhatsappPublico(telefono)}`;
}

export function armarEnlace(destino: DestinoBanner, contexto: ContextoDestino): string | null {
  switch (destino.tipo) {
    case "ninguno":
      return null;
    case "productos":
      return `${contexto.urlCatalogo}${ANCLA_PRODUCTOS}`;
    case "categoria":
      return enlaceDeCategoria(contexto.urlCatalogo, destino.categoriaId);
    case "producto":
      return destino.codigo ? enlaceDeProducto(contexto.urlCatalogo, destino.codigo) : null;
    case "whatsapp":
      return enlaceDeWhatsapp(contexto.telefonoWhatsapp);
    case "ubicacion":
      /* Sin ubicación publicada no hay a dónde llevar. Se devuelve nulo en vez
         de una dirección vacía: un banner que no lleva a ninguna parte es un
         aviso, y eso el catálogo ya lo sabe dibujar. */
      return contexto.ubicacionUrl?.trim() || null;
    case "otra":
      return destino.url.trim() || null;
  }
}

/* El camino de vuelta: qué destino representa una dirección ya guardada.
 *
 * Sin esto, abrir el formulario de un banner que lleva a una categoría mostraría
 * «otra dirección» con una URL larga al lado, y el dueño no reconocería lo que
 * él mismo eligió. Peor: al guardar sin tocar nada, quedaría marcado como
 * dirección externa para siempre.
 */
export function leerDestino(enlace: string | null, contexto: ContextoDestino): DestinoBanner {
  const url = enlace?.trim() ?? "";
  if (url === "") return { tipo: "ninguno" };

  if (url === `${contexto.urlCatalogo}${ANCLA_PRODUCTOS}`) return { tipo: "productos" };

  const prefijoFiltro = `${contexto.urlCatalogo}?categoria=`;
  const prefijoAncla = `${contexto.urlCatalogo}${ANCLA_CATEGORIA}`;
  const categoriaGuardada = url.startsWith(prefijoFiltro)
    ? decodeURIComponent(url.slice(prefijoFiltro.length).replace(ANCLA_PRODUCTOS, ""))
    : url.startsWith(prefijoAncla)
      ? url.slice(prefijoAncla.length)
      : null;
  if (categoriaGuardada !== null) {
    const categoriaId = categoriaGuardada;
    /* Solo si la categoría todavía existe. Si el dueño la borró, el enlace
       apunta a un ancla muerta y conviene que lo vea como lo que es —una
       dirección cualquiera— en vez de como una categoría que ya no está. */
    if (contexto.categorias.some(({ id }) => id === categoriaId)) {
      return { tipo: "categoria", categoriaId };
    }
    return { tipo: "otra", url };
  }

  const prefijoProducto = `${contexto.urlCatalogo}/p/`;
  if (url.startsWith(prefijoProducto)) {
    const codigo = decodeURIComponent(url.slice(prefijoProducto.length));
    if (contexto.productos.some((producto) => producto.codigo === codigo)) {
      return { tipo: "producto", codigo };
    }
    return { tipo: "otra", url };
  }

  if (contexto.telefonoWhatsapp && url === enlaceDeWhatsapp(contexto.telefonoWhatsapp)) {
    return { tipo: "whatsapp" };
  }

  if (contexto.ubicacionUrl && url === contexto.ubicacionUrl.trim()) {
    return { tipo: "ubicacion" };
  }

  return { tipo: "otra", url };
}

/* Cómo se sigue el enlace de un cartel —la portada, un banner—: a dónde y si
   abre aparte. Lo que se queda en el catálogo va en la misma pestaña; lo de
   afuera abre aparte para no sacar al visitante del negocio; y el WhatsApp
   lleva el mensaje de la promoción. Una sola regla para los tres lugares que
   dibujan un cartel. */
export function enlaceDelCartel(texto: {
  enlace: string | null;
  titulo?: string | null;
  eyebrow?: string | null;
  copy?: string | null;
}): { href: string; aparte: boolean } | null {
  if (!texto.enlace) return null;
  const interno = destinoEnElCatalogo(texto.enlace);
  if (interno) return { href: interno, aparte: false };
  return { href: whatsappConPromocion(texto.enlace, texto) ?? texto.enlace, aparte: true };
}
