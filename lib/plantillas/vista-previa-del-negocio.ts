import { FORMA_TARJETA_POR_OMISION, esFormaTarjeta, type FormaTarjeta, type PaletaId } from "../apariencia";
import { esTipoNegocio } from "../modalidades";
import { leerBanners, type Banner } from "../negocios/banners";
import { obtenerUrlPublicaImagenNegocio } from "../negocios/imagenes-publicas";
import { leerTextoPortada, type TextoSobreImagen } from "../negocios/texto-sobre-imagen";
import { acotarOpacidad } from "../patrones-fondo";
import { crearDatosDemoPlantilla } from "./datos-demo";
import type { DatosPlantilla } from "./tipos";
import { esPaletaId } from "./validacion";

/* La vista previa del catálogo en el panel, armada en un solo lugar.
 *
 * La usan Apariencia y Promociones: las dos muestran el catálogo del negocio
 * mientras el dueño cambia algo —la paleta, la portada, un banner—. Estaba
 * escrita adentro de la página de Apariencia; con dos pantallas, dos copias
 * terminan mostrando dos catálogos distintos.
 *
 * Corre en el servidor, que es quien conoce la dirección del proyecto: las
 * imágenes guardadas son rutas del depósito y la muestra necesita direcciones.
 */
export type FilaVistaPrevia = {
  slug: string;
  nombre: string;
  descripcion: string | null;
  telefono_whatsapp: string | null;
  tipo_negocio: string | null;
  paleta_id: string | null;
  rubro: string | null;
  patron_fondo: boolean | null;
  patron_opacidad: number | null;
  subnombre: string | null;
  banners: unknown;
  logo_url: string | null;
  portada_url: string | null;
  portada_texto: unknown;
  forma_tarjeta: string | null;
};

export type VistaPreviaDelNegocio = {
  datos: DatosPlantilla;
  paleta: PaletaId;
  forma: FormaTarjeta;
  patron: boolean;
  opacidad: number;
  bannersGuardados: Array<Banner | null>;
  portadaGuardada: TextoSobreImagen;
  /* La dirección pública de cada imagen de banner guardada, por su ruta. */
  urlPorRuta: Record<string, string>;
};

export function armarVistaPrevia(negocio: FilaVistaPrevia, urlSupabase: string): VistaPreviaDelNegocio {
  const paleta = esPaletaId(negocio.paleta_id) ? negocio.paleta_id : "mercado";
  const forma = esFormaTarjeta(negocio.forma_tarjeta) ? negocio.forma_tarjeta : FORMA_TARJETA_POR_OMISION;
  const patron = negocio.patron_fondo !== false;
  const opacidad = acotarOpacidad(negocio.patron_opacidad);
  const bannersGuardados = leerBanners(negocio.banners);
  const portadaGuardada = leerTextoPortada(negocio.portada_texto);

  const urlPorRuta = Object.fromEntries(
    /* Los lugares vacíos no tienen imagen que resolver. */
    bannersGuardados
      .filter((banner) => banner !== null)
      .map((banner) => [banner.imagen, obtenerUrlPublicaImagenNegocio(urlSupabase, banner.imagen, "banner") ?? ""]),
  );

  const datos = crearDatosDemoPlantilla({
    nombre: negocio.nombre,
    descripcion: negocio.descripcion,
    telefonoWhatsapp: negocio.telefono_whatsapp ?? "",
    tipoNegocio: esTipoNegocio(negocio.tipo_negocio) ? negocio.tipo_negocio : "catalogo_estatico",
    rubro: negocio.rubro,
    patronFondo: patron,
    patronOpacidad: opacidad,
    subnombre: negocio.subnombre?.trim() || null,
    /* La portada y el logo de verdad, para que la muestra dibuje el texto
       donde va a quedar y no sobre una foto inventada. */
    portadaUrl: obtenerUrlPublicaImagenNegocio(urlSupabase, negocio.portada_url, "portada"),
    logoUrl: obtenerUrlPublicaImagenNegocio(urlSupabase, negocio.logo_url, "logo"),
    portadaTexto: portadaGuardada,
    formaTarjeta: forma,
  });

  return { datos, paleta, forma, patron, opacidad, bannersGuardados, portadaGuardada, urlPorRuta };
}

/* Los banners en edición, listos para la muestra: con la dirección de su
   imagen en vez de la ruta, y los que no tienen imagen como lugar vacío. */
export function bannersParaMostrar(
  banners: ReadonlyArray<Banner | null>,
  urlPorRuta: Record<string, string>,
): Array<Banner | null> {
  return banners.map((banner) => {
    if (!banner) return null;
    const url = urlPorRuta[banner.imagen];
    return url ? { ...banner, imagen: url } : null;
  });
}
