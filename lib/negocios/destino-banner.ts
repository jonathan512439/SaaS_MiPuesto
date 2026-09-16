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

function enlaceDeCategoria(urlCatalogo: string, categoriaId: string): string {
  /* El mismo ancla que dibuja la plantilla. Si alguna vez cambia allá, esto
     queda apuntando a un lugar que no existe y el banner lleva al principio del
     catálogo: molesto, pero no roto. */
  return `${urlCatalogo}#categoria-${categoriaId}`;
}

function enlaceDeWhatsapp(telefono: string): string {
  return `https://wa.me/${normalizarTelefonoWhatsappPublico(telefono)}`;
}

export function armarEnlace(destino: DestinoBanner, contexto: ContextoDestino): string | null {
  switch (destino.tipo) {
    case "ninguno":
      return null;
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

  const conAncla = url.startsWith(`${contexto.urlCatalogo}#categoria-`);
  if (conAncla) {
    const categoriaId = url.slice(`${contexto.urlCatalogo}#categoria-`.length);
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
