import type { PaletaId, PlantillaId } from "../apariencia";
import { evaluarHorario } from "../horario";
import { obtenerComportamientoModalidad } from "../modalidades";
import type { DatosPlantilla } from "../plantillas/tipos";
import { construirEnlaceWhatsapp, construirMensajeProducto } from "../whatsapp";
import { calcularCantidadDisponible } from "../reservas";
import { obtenerUrlPublicaImagenProducto } from "./imagenes-publicas";

type NegocioPublico = {
  slug?: string;
  nombre: string;
  descripcion: string | null;
  telefono_whatsapp: string;
  tipo_negocio: string;
  horario: unknown;
  plantilla_id: string;
  paleta_id: string;
  qr_pago_url?: string | null;
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
): { datos: DatosPlantilla; plantilla: PlantillaId; paleta: PaletaId } {
  const modalidad = obtenerComportamientoModalidad(negocio.tipo_negocio);
  const atencion = evaluarHorario(negocio.horario, fecha);
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
    const precio = Number(producto.precio);
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
    plantilla:
      negocio.plantilla_id === "moderna" || negocio.plantilla_id === "minimal"
        ? negocio.plantilla_id
        : "clasica",
    paleta:
      negocio.paleta_id === "tierra" ||
      negocio.paleta_id === "oceano" ||
      negocio.paleta_id === "noche"
        ? negocio.paleta_id
        : "mercado",
    datos: {
      negocio: {
        slug: negocio.slug ?? "",
        nombre: negocio.nombre,
        descripcion:
          negocio.descripcion?.trim() || "Conoce nuestros productos y servicios disponibles.",
        telefonoWhatsapp: negocio.telefono_whatsapp,
        modalidad: modalidad.accion,
        descripcionModalidad: modalidad.descripcion,
        atencion,
        qrPagoUrl:
          typeof negocio.qr_pago_url === "string" && negocio.qr_pago_url.startsWith("https://")
            ? negocio.qr_pago_url
            : null,
      },
      categorias: agrupadas,
    },
  };
}
