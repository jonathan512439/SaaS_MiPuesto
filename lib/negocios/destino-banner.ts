import { normalizarTelefonoWhatsappPublico } from "../whatsapp";

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
  | { tipo: "whatsapp" }
  | { tipo: "ubicacion" }
  | { tipo: "otra"; url: string };

export type ContextoDestino = {
  /* La dirección del catálogo, ya armada por quien conoce el dominio. */
  urlCatalogo: string;
  telefonoWhatsapp: string;
  ubicacionUrl: string | null;
  categorias: ReadonlyArray<{ id: string; nombre: string }>;
};

/* Las anclas que dibuja la plantilla. Si alguna vez cambian allá, esto queda
   apuntando a un lugar que no existe y el banner lleva al principio del
   catálogo: molesto, pero no roto. */
const ANCLA_PRODUCTOS = "#productos";
const ANCLA_CATEGORIA = "#categoria-";

function enlaceDeCategoria(urlCatalogo: string, categoriaId: string): string {
  return `${urlCatalogo}${ANCLA_CATEGORIA}${categoriaId}`;
}

/* Si el enlace se queda dentro del catálogo, devuelve solo su ancla.
 *
 * Un destino «una categoría» o «mis productos» se guarda como la dirección
 * completa del catálogo con su ancla, para que el dato sea una URL como
 * cualquier otra. Pero al dibujarlo, esa dirección completa abría **una pestaña
 * nueva del mismo catálogo** —el banner y la portada abren sus enlaces aparte
 * para no sacar al visitante del negocio—, y bajar a una categoría no es salir.
 * Con el ancla sola, el navegador se desplaza en la misma página, también en la
 * vista previa del panel, que no vive en la dirección del catálogo. */
export function anclaDelCatalogo(enlace: string | null): string | null {
  if (!enlace) return null;
  const almohadilla = enlace.indexOf("#");
  if (almohadilla === -1) return null;
  const ancla = enlace.slice(almohadilla);
  return ancla === ANCLA_PRODUCTOS || ancla.startsWith(ANCLA_CATEGORIA) ? ancla : null;
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

  const conAncla = url.startsWith(`${contexto.urlCatalogo}${ANCLA_CATEGORIA}`);
  if (conAncla) {
    const categoriaId = url.slice(`${contexto.urlCatalogo}${ANCLA_CATEGORIA}`.length);
    /* Solo si la categoría todavía existe. Si el dueño la borró, el enlace
       apunta a un ancla muerta y conviene que lo vea como lo que es —una
       dirección cualquiera— en vez de como una categoría que ya no está. */
    if (contexto.categorias.some(({ id }) => id === categoriaId)) {
      return { tipo: "categoria", categoriaId };
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
