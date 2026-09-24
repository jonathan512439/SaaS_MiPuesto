import {
  FORMA_TARJETA_POR_OMISION,
  esFormaTarjeta,
  type PaletaId,
} from "../apariencia";
import { evaluarHorario } from "../horario";
import { obtenerComportamientoModalidad } from "../modalidades";
import { leerBanners } from "../negocios/banners";
import { leerTextoPortada } from "../negocios/texto-sobre-imagen";
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
import { leerAtributos, type Atributo } from "./atributos";
import { ICONO_PREDETERMINADO, normalizarIcono } from "./categorias";
import { lineaDeTarjeta, valoresParaMostrar } from "./valores";
import { esTipoPresentacion, nombreConPresentacion, ordenarPresentaciones } from "./variantes";
import { esPaletaId } from "../plantillas/validacion";
import { acotarOpacidad } from "../patrones-fondo";

type NegocioPublico = {
  id?: string;
  slug?: string;
  nombre: string;
  descripcion: string | null;
  telefono_whatsapp: string;
  tipo_negocio: string;
  horario: unknown;
  paleta_id: string;
  logo_url?: string | null;
  portada_url?: string | null;
  portada_texto?: unknown;
  forma_tarjeta?: string | null;
  qr_pago_url?: string | null;
  ubicacion_url?: string | null;
  pide_numero_mesa?: boolean | null;
  resenas_url?: string | null;
  rubro?: string | null;
  patron_fondo?: boolean | null;
  patron_opacidad?: number | null;
  subnombre?: string | null;
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
  vende?: string;
};
/* Las definiciones de campos de todas las categorías del negocio, juntas. Se
   pasan enteras y se agrupan acá en vez de pedir una consulta por categoría: son
   diez filas por categoría y el catálogo las necesita todas para dibujar. */
export type AtributoPublico = {
  categoria_id: string;
  clave: string;
  nombre: string;
  tipo: string;
  unidad: string | null;
  opciones: string[];
  en_tarjeta: boolean;
  en_resumen: boolean;
  orden: number;
};

export type VariantePublica = {
  id: string;
  producto_id: string;
  nombre: string;
  precio: number | null;
  cantidad_stock: number | null;
  cantidad_reservada?: number;
  visible: boolean;
  orden: number;
};

type SubcategoriaPublica = { id: string; categoria_id: string; nombre: string; orden: number };

type ProductoPublico = {
  id: string;
  codigo?: string;
  /* Los valores de los campos de su categoría, tal como vienen de la base. Se
     leen con las definiciones al lado: sin ellas un valor suelto no se puede ni
     formatear ni saber si todavía corresponde. */
  atributos?: unknown;
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
  /* Cuánto dura este servicio. Nulo: la de su categoría. */
  duracion_minutos?: number | null;
  /* Fase 13. */
  con_presentaciones?: boolean;
  tipo_presentacion?: string;
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
  atributos: AtributoPublico[] = [],
  variantes: VariantePublica[] = [],
): { datos: DatosPlantilla; paleta: PaletaId } {
  /* Agrupadas por producto una sola vez, por lo mismo que los campos: filtrar la
     lista entera por cada producto sería recorrerla cuarenta veces. */
  const variantesPorProducto = new Map<string, VariantePublica[]>();
  for (const fila of [...variantes].sort((a, b) => a.orden - b.orden)) {
    if (fila.visible === false) continue;
    const lista = variantesPorProducto.get(fila.producto_id) ?? [];
    lista.push(fila);
    variantesPorProducto.set(fila.producto_id, lista);
  }
  /* Agrupados por categoría una sola vez, antes de recorrer los productos: con
     cuarenta productos, filtrar la lista entera por cada uno sería cuarenta
     recorridas de lo mismo. */
  /* Qué categorías venden tiempo. Se arma una vez con el conjunto que ya llegó
     en vez de consultar aparte: la lista de categorías la tiene el catálogo
     desde siempre. */
  const vendenTiempo = new Set(
    categorias.filter((categoria) => categoria.vende === "tiempo").map(({ id }) => id),
  );

  const atributosPorCategoria = new Map<string, Atributo[]>();
  for (const fila of [...atributos].sort((a, b) => a.orden - b.orden)) {
    const lista = atributosPorCategoria.get(fila.categoria_id) ?? [];
    lista.push(...leerAtributos([fila]));
    atributosPorCategoria.set(fila.categoria_id, lista);
  }
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
    const definiciones = atributosPorCategoria.get(producto.categoria_id ?? "") ?? [];
    const precioCalculado = calcularPrecioProducto(
      Number(producto.precio),
      { productoId: producto.id, categoriaId: producto.categoria_id },
      promociones,
      fecha,
    );
    const precio = precioCalculado.precioFinal;
    const presentaciones = variantesPorProducto.get(producto.id) ?? [];
    const tipoPresentacion = esTipoPresentacion(producto.tipo_presentacion)
      ? producto.tipo_presentacion
      : "presentacion";
    /* Con presentaciones y control de existencias, las del producto están en
       nulo (fase 13): lo que queda es la suma de lo que queda de cada una. */
    const cantidadDisponible =
      producto.controla_stock === true && presentaciones.length > 0
        ? presentaciones.reduce(
            (suma, variante) =>
              suma +
              (calcularCantidadDisponible({
                controlaStock: true,
                cantidadStock: variante.cantidad_stock ?? null,
                cantidadReservada: variante.cantidad_reservada ?? 0,
              }) ?? 0),
            0,
          )
        : calcularCantidadDisponible({
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
              construirMensajeProducto(negocio.nombre, {
                nombre: producto.nombre,
                precio,
                /* Los que el dueño marcó para el resumen, no los de la tarjeta:
                   en la tarjeta manda el espacio y acá manda que quien prepara
                   el pedido no tenga que volver a preguntar. */
                datos: valoresParaMostrar(definiciones, producto.atributos, "resumen"),
              }),
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
      /* Resueltos acá y no en la plantilla: así ninguna necesita conocer los
         tipos, las unidades ni qué campo va en qué lugar. */
      vendeTiempo: vendenTiempo.has(producto.categoria_id ?? ""),
      lineaAtributos: lineaDeTarjeta(definiciones, producto.atributos),
      especificaciones: valoresParaMostrar(definiciones, producto.atributos, "ficha"),
      /* El precio se resuelve acá: el propio de la presentación, o el del
         producto si no tiene. Nótese que se parte del precio **ya calculado con
         promociones**, así que un descuento del catálogo alcanza a las
         presentaciones que no fijaron precio propio, y no a las que sí. Es lo
         esperable: quien puso un precio fijo para «7,5 kg» puso ese precio. */
      tipoPresentacion,
      variantes: ordenarPresentaciones(tipoPresentacion, presentaciones).map((variante) => {
        const precioVariante = variante.precio === null ? precio : Number(variante.precio);
        return {
          id: variante.id,
          nombre: variante.nombre,
          precio: precioVariante,
          disponibles: calcularCantidadDisponible({
            controlaStock: producto.controla_stock === true,
            cantidadStock: variante.cantidad_stock ?? null,
            cantidadReservada: variante.cantidad_reservada ?? 0,
          }),
          accionWhatsapp:
            modalidad.accion === "accion_individual"
              ? construirEnlaceWhatsapp(
                  negocio.telefono_whatsapp,
                  construirMensajeProducto(negocio.nombre, {
                    /* El nombre lleva la presentación pegada: quien recibe el
                       mensaje tiene que leer «Remera lisa (Talla M)» y no
                       adivinar cuál de las tres tallas le pidieron. */
                    nombre: nombreConPresentacion(producto.nombre, tipoPresentacion, variante.nombre),
                    precio: precioVariante,
                    datos: valoresParaMostrar(definiciones, producto.atributos, "resumen"),
                  }),
                )
              : null,
        };
      }),
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

  return {
    /* Se resuelve con el validador y no con una lista escrita a mano: la lista
       anterior se quedó corta y un negocio que elegía una paleta nueva recibía
       Mercado sin que nada avisara. El validador sale del mismo registro que el
       resto, así que no puede quedarse atrás. */
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
        /* Con el lector y no crudo, como los banners: lo que hay en esa columna
           puede venir de una restauración o de un script. */
        portadaTexto: leerTextoPortada(negocio.portada_texto),
        /* Una forma desconocida cae en la de omisión: la columna tiene su
           restricción, pero esta fila puede venir de una restauración. */
        formaTarjeta: esFormaTarjeta(negocio.forma_tarjeta)
          ? negocio.forma_tarjeta
          : FORMA_TARJETA_POR_OMISION,
        qrPagoUrl: obtenerUrlPublicaImagenNegocio(urlSupabase, negocio.qr_pago_url ?? null, "qr"),
        ubicacionUrl: negocio.ubicacion_url?.trim() || null,
        pideNumeroMesa: negocio.pide_numero_mesa === true,
        resenasUrl: negocio.resenas_url?.trim() || null,
        rubro: negocio.rubro ?? null,
        /* Solo `false` apaga. Un negocio anterior a la columna llega sin el dato
           y no tendria sentido apagarle un fondo que nunca eligio apagar. */
        patronFondo: negocio.patron_fondo !== false,
        /* Se acota acá también y no solo en la base: esta fila puede venir de una
           restauración o de un script, y un número fuera de rango pintaría un
           fondo que tapa el texto. */
        patronOpacidad: acotarOpacidad(negocio.patron_opacidad),
        subnombre: negocio.subnombre?.trim() || null,
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
        banners: leerBanners(negocio.banners).map((banner) =>
          banner
            ? {
                ...banner,
                imagen: obtenerUrlPublicaImagenNegocio(urlSupabase, banner.imagen, "banner") ?? "",
              }
            : null,
        ),
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
