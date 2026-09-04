import { obtenerComportamientoModalidad } from "../modalidades";
import { calcularPrecioProducto, type PromocionPrecio } from "../precios";
import { calcularCantidadDisponible } from "../reservas";
import { construirEnlaceWhatsapp, construirMensajeProducto } from "../whatsapp";
import { obtenerUrlPublicaImagenProducto } from "./imagenes-publicas";

/* La vista de un producto suelto necesita lo que la tarjeta del catálogo no
   muestra: todas las fotografías y la descripción entera. El resto —precio con
   promoción, disponibilidad y enlace de WhatsApp— sale de la misma lógica
   compartida, para que un producto no valga distinto según la pantalla. */
export type ProductoDetallePublico = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  precio: number;
  precioOriginal: number;
  tienePromocion: boolean;
  imagenes: Array<{ src: string; alt: string }>;
  estado: string;
  controlaStock: boolean;
  cantidadDisponible: number | null;
  accionWhatsapp: string | null;
};

type NegocioDelProducto = {
  nombre: string;
  telefono_whatsapp: string;
  tipo_negocio: string;
};

type ProductoCrudo = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  fotos: string[];
  estado: string;
  controla_stock: boolean;
  cantidad_stock: number | null;
  cantidad_reservada: number;
  categoria_id: string | null;
};

export function construirProductoPublico(
  negocio: NegocioDelProducto,
  producto: ProductoCrudo,
  urlSupabase: string,
  fecha: Date,
  promociones: PromocionPrecio[],
): ProductoDetallePublico {
  const modalidad = obtenerComportamientoModalidad(negocio.tipo_negocio);
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

  return {
    id: producto.id,
    codigo: producto.codigo,
    nombre: producto.nombre,
    descripcion: producto.descripcion ?? "",
    precio,
    precioOriginal: precioCalculado.precioOriginal,
    tienePromocion: precioCalculado.promocion !== null,
    imagenes: producto.fotos.map((ruta, indice) => ({
      src: obtenerUrlPublicaImagenProducto(urlSupabase, ruta),
      alt:
        indice === 0
          ? producto.nombre
          : `${producto.nombre}, fotografía ${indice + 1}`,
    })),
    estado:
      cantidadDisponible === 0 && producto.estado === "disponible"
        ? "reservado"
        : producto.estado,
    controlaStock: producto.controla_stock === true,
    cantidadDisponible,
    accionWhatsapp:
      modalidad.accion === "solo_lectura"
        ? null
        : construirEnlaceWhatsapp(
            negocio.telefono_whatsapp,
            construirMensajeProducto(negocio.nombre, { nombre: producto.nombre, precio }),
          ),
  };
}
