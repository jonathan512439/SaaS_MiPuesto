import type { PaletaId, PlantillaId } from "../apariencia";
import { evaluarHorario } from "../horario";
import { obtenerComportamientoModalidad } from "../modalidades";
import type { DatosPlantilla } from "../plantillas/tipos";
import { construirEnlaceWhatsapp, construirMensajeProducto } from "../whatsapp";
import { calcularCantidadDisponible } from "../reservas";
import { calcularPrecioProducto, type PromocionPrecio } from "../precios";
import { obtenerUrlPublicaImagenProducto } from "./imagenes-publicas";
import { obtenerRedesSociales } from "../negocios/identidad";
import { obtenerUrlPublicaImagenNegocio } from "../negocios/imagenes-publicas";
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
  redes_sociales?: unknown;
};

type CategoriaPublica = { id: string; nombre: string; orden: number };
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
      productos: visibles
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
          productos: visibles
            .filter((producto) => producto.subcategoria_id === subcategoria.id)
            .map(convertirProducto),
        }))
        .filter((subcategoria) => subcategoria.productos.length > 0),
    }))
    .filter(
      (categoria) =>
        categoria.productos.length > 0 || categoria.subcategorias.length > 0,
    );
  const sinCategoria = visibles
    .filter((producto) => producto.categoria_id === null)
    .map(convertirProducto);
  if (sinCategoria.length > 0) {
    agrupadas.push({
      id: "otros",
      nombre: "Otros",
      productos: sinCategoria,
      subcategorias: [],
    });
  }

  return {
    /* Se resuelve con el validador y no con una lista escrita a mano: la lista
       anterior se quedó en tres plantillas y cuatro paletas, de modo que un
       negocio que elegía Feria o Altiplano recibía Clásica y Mercado sin que
       nada avisara. El validador sale del mismo registro que el resto. */
    plantilla: esPlantillaId(negocio.plantilla_id) ? negocio.plantilla_id : "clasica",
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
        redesSociales: [
          { nombre: "Facebook", url: redes.facebook },
          { nombre: "Instagram", url: redes.instagram },
          { nombre: "TikTok", url: redes.tiktok },
          { nombre: "Sitio web", url: redes.sitio_web },
        ].flatMap(({ nombre, url }) => (url ? [{ nombre, url }] : [])),
      },
      categorias: agrupadas,
    },
  };
}
