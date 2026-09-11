import { tarjetaValidaPara, type PaletaId, type PlantillaId } from "../apariencia";
import { evaluarHorario } from "../horario";
import { obtenerComportamientoModalidad } from "../modalidades";
import { leerBanners } from "../negocios/banners";
import type { DatosPlantilla } from "../plantillas/tipos";
import { construirEnlaceWhatsapp, construirMensajeProducto } from "../whatsapp";
import { calcularCantidadDisponible } from "../reservas";
import { calcularPrecioProducto, type PromocionPrecio } from "../precios";
import {
  CATEGORIA_CARTA_DEL_DIA,
  NOMBRE_CARTA_DEL_DIA,
  estaEnLaCartaDeHoy,
} from "./carta-del-dia";
import { obtenerUrlPublicaImagenProducto } from "./imagenes-publicas";
import { obtenerRedesSociales } from "../negocios/identidad";
import { obtenerUrlPublicaImagenNegocio } from "../negocios/imagenes-publicas";
import { ICONO_PREDETERMINADO, normalizarIcono } from "./categorias";
import { esPaletaId, esPlantillaId } from "../plantillas/validacion";

type NegocioPublico = {
  id?: string;
  slug?: string;
  nombre: string;
  descripcion: string | null;
  telefono_whatsapp: string;
  tipo_negocio: string;
  horario: unknown;
  plantilla_id: string;
  paleta_id: string;
  logo_url?: string | null;
  portada_url?: string | null;
  qr_pago_url?: string | null;
  ubicacion_url?: string | null;
  pide_numero_mesa?: boolean | null;
  resenas_url?: string | null;
  rubro?: string | null;
  tarjeta_id?: string | null;
  patron_fondo?: boolean | null;
  redes_sociales?: unknown;
  /* Opcional y sin tipar por dentro, igual que `redes_sociales` y `horario`: lo
     que hay en esa columna lo interpreta su propio lector, que no confía en
     nada. Declararla `Banner[]` acá sería afirmar sobre datos que todavía no se
     validaron. */
  banners?: unknown;
};

type CategoriaPublica = {
  id: string;
  nombre: string;
  orden: number;
  /* Los dos nacen con valor por omisión en la base, pero se leen opcionales: una
     consulta vieja que no los pida no tiene por qué dejar de compilar, y la
     esfera sin ícono cae al predeterminado igual que cualquier otra. */
  icono?: string;
  visible?: boolean;
};
type SubcategoriaPublica = { id: string; categoria_id: string; nombre: string; orden: number };

type ProductoPublico = {
  id: string;
  codigo?: string;
  categoria_id: string | null;
  subcategoria_id: string | null;
  nombre: string;
  descripcion: string | null;
  precio: number;
  fotos: string[];
  estado: string;
  controla_stock?: boolean;
  cantidad_stock?: number | null;
  cantidad_reservada?: number;
  visible: boolean;
  orden: number;
  en_carta_hasta?: string | null;
};

export function obtenerTextoHorario(horario: unknown) {
  return evaluarHorario(horario).texto;
}

export function construirCatalogoPublico(
  negocio: NegocioPublico,
  categorias: CategoriaPublica[],
  subcategorias: SubcategoriaPublica[],
  productos: ProductoPublico[],
  urlSupabase: string,
  fecha: Date = new Date(),
  promociones: PromocionPrecio[] = [],
): { datos: DatosPlantilla; plantilla: PlantillaId; paleta: PaletaId } {
  const modalidad = obtenerComportamientoModalidad(negocio.tipo_negocio);
  const atencion = evaluarHorario(negocio.horario, fecha);
  const redes = obtenerRedesSociales(negocio.redes_sociales);
  const visibles = productos
    .filter((producto) => producto.visible)
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
  const enLaCartaDeHoy = (producto: ProductoPublico) =>
    estaEnLaCartaDeHoy(producto.en_carta_hasta ?? null, fecha);
  /* Los del día salen de su categoría y no aparecen dos veces: una carta del
     día que repite lo que ya está más abajo hace más largo el catálogo en vez de
     más corto, que es justamente lo contrario de para qué existe. */
  const delResto = visibles.filter((producto) => !enLaCartaDeHoy(producto));
  const categoriasOrdenadas = [...categorias].sort(
    (a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre),
  );
  const subcategoriasOrdenadas = [...subcategorias].sort(
    (a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre),
  );
  const convertirProducto = (producto: ProductoPublico) => {
    const precioCalculado = calcularPrecioProducto(
      Number(producto.precio),
      { productoId: producto.id, categoriaId: producto.categoria_id },
      promociones,
      fecha,
    );
    const precio = precioCalculado.precioFinal;
    const cantidadDisponible = calcularCantidadDisponible({
      controlaStock: producto.controla_stock === true,
      cantidadStock: producto.cantidad_stock ?? null,
      cantidadReservada: producto.cantidad_reservada ?? 0,
    });
    const estado =
      cantidadDisponible === 0 && producto.estado === "disponible"
        ? "reservado"
        : producto.estado;
    return {
      id: producto.id,
      codigo: producto.codigo ?? `PRD-${producto.id.slice(0, 8).toUpperCase()}`,
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? "",
      precio,
      precioOriginal: precioCalculado.precioOriginal,
      tienePromocion: precioCalculado.promocion !== null,
      estado,
      controlaStock: producto.controla_stock === true,
      cantidadDisponible,
      maximoCantidad: cantidadDisponible === null ? 99 : Math.min(99, cantidadDisponible),
      accionWhatsapp:
        modalidad.accion === "accion_individual"
          ? construirEnlaceWhatsapp(
              negocio.telefono_whatsapp,
              construirMensajeProducto(negocio.nombre, { nombre: producto.nombre, precio }),
            )
          : null,
      imagen: producto.fotos[0]
        ? {
            src: obtenerUrlPublicaImagenProducto(urlSupabase, producto.fotos[0]),
            alt: producto.nombre,
          }
        : null,
      imagenes: producto.fotos.map((ruta, indice) => ({
        src: obtenerUrlPublicaImagenProducto(urlSupabase, ruta),
        alt: indice === 0 ? producto.nombre : `${producto.nombre}, fotografía ${indice + 1}`,
      })),
    };
  };
  const agrupadas = categoriasOrdenadas
    .map((categoria) => ({
      id: categoria.id,
      nombre: categoria.nombre,
      icono: normalizarIcono(categoria.icono),
      productos: delResto
        .filter(
          (producto) =>
            producto.categoria_id === categoria.id && producto.subcategoria_id === null,
        )
        .map(convertirProducto),
      subcategorias: subcategoriasOrdenadas
        .filter((subcategoria) => subcategoria.categoria_id === categoria.id)
        .map((subcategoria) => ({
          id: subcategoria.id,
          nombre: subcategoria.nombre,
          productos: delResto
            .filter((producto) => producto.subcategoria_id === subcategoria.id)
            .map(convertirProducto),
        }))
        .filter((subcategoria) => subcategoria.productos.length > 0),
    }))
    .filter(
      (categoria) =>
        categoria.productos.length > 0 || categoria.subcategorias.length > 0,
    );
  const sinCategoria = delResto
    .filter((producto) => producto.categoria_id === null)
    .map(convertirProducto);
  if (sinCategoria.length > 0) {
    agrupadas.push({
      id: "otros",
      nombre: "Otros",
      /* La inventa el sistema para los productos sin categoría, así que no tiene
         ícono elegido por nadie: lleva el mismo predeterminado que cualquier
         categoría a la que le falte el suyo. */
      icono: ICONO_PREDETERMINADO,
      productos: sinCategoria,
      subcategorias: [],
    });
  }

  /* Delante de todo: quien abre el catálogo al mediodía quiere saber qué hay
     hoy, no recorrer la carta entera. */
  const delDia = visibles.filter(enLaCartaDeHoy).map(convertirProducto);
  if (delDia.length > 0) {
    agrupadas.unshift({
      id: CATEGORIA_CARTA_DEL_DIA,
      nombre: NOMBRE_CARTA_DEL_DIA,
      /* La carta del día es del rubro gastronómico y el dueño no la crea: su
         ícono lo pone el sistema. */
      icono: "gorro-chef",
      productos: delDia,
      subcategorias: [],
    });
  }

  /* Se resuelve con el validador y no con una lista escrita a mano: la lista
     anterior se quedó en tres plantillas y cuatro paletas, de modo que un
     negocio que elegía Feria o Altiplano recibía Clásica y Mercado sin que nada
     avisara. El validador sale del mismo registro que el resto.
     Se calcula antes del `return` porque la tarjeta depende de ella: qué formas
     son válidas lo decide la plantilla. */
  const plantilla: PlantillaId = esPlantillaId(negocio.plantilla_id)
    ? negocio.plantilla_id
    : "clasica";

  return {
    plantilla,
    paleta: esPaletaId(negocio.paleta_id) ? negocio.paleta_id : "mercado",
    datos: {
      negocio: {
        id: negocio.id ?? "",
        slug: negocio.slug ?? "",
        nombre: negocio.nombre,
        descripcion:
          negocio.descripcion?.trim() || "Conoce nuestros productos y servicios disponibles.",
        telefonoWhatsapp: negocio.telefono_whatsapp,
        modalidad: modalidad.accion,
        descripcionModalidad: modalidad.descripcion,
        atencion,
        logoUrl: obtenerUrlPublicaImagenNegocio(urlSupabase, negocio.logo_url ?? null, "logo"),
        portadaUrl: obtenerUrlPublicaImagenNegocio(
          urlSupabase,
          negocio.portada_url ?? null,
          "portada",
        ),
        qrPagoUrl: obtenerUrlPublicaImagenNegocio(urlSupabase, negocio.qr_pago_url ?? null, "qr"),
        ubicacionUrl: negocio.ubicacion_url?.trim() || null,
        pideNumeroMesa: negocio.pide_numero_mesa === true,
        resenasUrl: negocio.resenas_url?.trim() || null,
        rubro: negocio.rubro ?? null,
        /* Solo `false` apaga. Un negocio anterior a la columna llega sin el dato
           y no tendria sentido apagarle un fondo que nunca eligio apagar. */
        patronFondo: negocio.patron_fondo !== false,
        redesSociales: [
          { nombre: "Facebook", url: redes.facebook },
          { nombre: "Instagram", url: redes.instagram },
          { nombre: "TikTok", url: redes.tiktok },
          { nombre: "Sitio web", url: redes.sitio_web },
        ].flatMap(({ nombre, url }) => (url ? [{ nombre, url }] : [])),
        /* Se lee con el validador y no se pasa crudo: lo que hay en esa columna
           puede venir de una restauración o de un script, y un banner mal
           formado no tiene por qué dejar el catálogo entero sin cargar. */
        /* La ruta se convierte en dirección acá, como el logo y la portada: lo
           guardado es una ruta del depósito, no una dirección con el proyecto
           adentro. */
        banners: leerBanners(negocio.banners).map((banner) => ({
          ...banner,
          imagen: obtenerUrlPublicaImagenNegocio(urlSupabase, banner.imagen, "banner") ?? "",
        })),
        /* Se corrige acá y no en la plantilla: una plantilla que tiene que
           defenderse de un valor imposible es una plantilla que sabe demasiado.
           Y el caso es real: el dueño elige «retrato» en Moderna y después se
           cambia a Feria, que no la dibuja. */
        tarjeta: tarjetaValidaPara(plantilla, negocio.tarjeta_id),
      },
      categorias: agrupadas,
    },
  };
}

/* Las categorías que van en la barra de navegación del catálogo.
 *
 * Se filtran las apagadas y **nada más**: sus productos siguen en el catálogo,
 * en su sección y en la búsqueda. Apagar una esfera es decir «no la pongas entre
 * los accesos rápidos de arriba», que es lo que necesita el negocio con doce
 * categorías y espacio para seis; no es esconder mercadería.
 *
 * Va acá, con las demás funciones puras del catálogo público, para que se pueda
 * probar sin montar una página: el orden y el filtrado son justamente lo que se
 * rompe en silencio.
 */
export function categoriasParaNavegar(
  categorias: ReadonlyArray<CategoriaPublica>,
): Array<{ id: string; nombre: string; icono: string }> {
  return categorias
    .filter((categoria) => categoria.visible !== false)
    .map((categoria) => ({
      id: categoria.id,
      nombre: categoria.nombre,
      icono: normalizarIcono(categoria.icono),
    }));
}
