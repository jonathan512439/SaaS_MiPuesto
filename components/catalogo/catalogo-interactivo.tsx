"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { PaletaId } from "../../lib/apariencia";
import { registrarEventoAnalitica } from "../../lib/analitica-cliente";
import {
  construirRutaCatalogo,
  type FiltrosCatalogo,
} from "../../lib/catalogo/consulta-publica";
import { construirFirmaCarrito } from "../../lib/pedidos/firma";
import { guardarPedido, leerPedidoGuardado } from "../../lib/pedidos/pedido-guardado";
import { calcularSubtotal, formatearPrecioBolivianos } from "../../lib/precios";
import type { DatosPlantilla, ProductoPlantilla } from "../../lib/plantillas/tipos";
import { limitarCantidadReserva } from "../../lib/reservas";
import { CarritoCatalogo } from "../carrito/carrito-catalogo";
import { HojaProducto } from "./hoja-producto";
import { HojaCatalogo } from "./hoja-catalogo";
import { PlantillaMipuesto } from "../templates/mipuesto/plantilla-mipuesto";
import { ColorNavegador } from "./color-navegador";
import temaStyles from "../templates/tema-catalogo.module.css";
import styles from "./catalogo-interactivo.module.css";
import { patronDeRubro } from "../../lib/patrones-fondo";

type PropiedadesCatalogoInteractivo = {
  datos: DatosPlantilla;
  paleta: PaletaId;
  slug: string;
  categoriasNavegacion: Array<{ id: string; nombre: string; icono: string }>;
  filtros: FiltrosCatalogo;
  totalProductos: number;
  totalPaginas: number;
};

/* Lo que se escribe se ve al instante, pero la consulta espera: sin esta pausa
   cada tecla sería un viaje al servidor. */
const ESPERA_BUSQUEDA = 350;

/* El catálogo tiene un solo diseño: PlantillaMipuesto. Antes acá se elegía una
   de cinco plantillas; la elección se retiró en la fase 6. */

function suscribirInmutable() {
  return () => {};
}

function obtenerProductos(datos: DatosPlantilla): ProductoPlantilla[] {
  return datos.categorias.flatMap((categoria) => [
    ...categoria.productos,
    ...(categoria.subcategorias ?? []).flatMap(
      (subcategoria) => subcategoria.productos,
    ),
  ]);
}

export function CatalogoInteractivo({
  datos,
  paleta,
  slug,
  categoriasNavegacion,
  filtros,
  totalProductos,
  totalPaginas,
}: PropiedadesCatalogoInteractivo) {
  const router = useRouter();
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  /* sessionStorage no existe al renderizar en el servidor; useSyncExternalStore
     da esa distinción sin encender estado en un efecto. */
  const montado = useSyncExternalStore(suscribirInmutable, () => true, () => false);
  const [negocioLeido, setNegocioLeido] = useState("");
  /* El carrito guarda su propia copia de cada producto agregado. Con la
     paginación en el servidor, la página que se está viendo ya no contiene
     necesariamente lo que el cliente eligió antes, y sin esta copia el pedido
     perdería los artículos al pasar de página. */
  const [elegidos, setElegidos] = useState<Record<string, ProductoPlantilla>>({});
  const [firmaReservada, setFirmaReservada] = useState("");
  const [pedidoAbierto, setPedidoAbierto] = useState(false);
  const [fichaDe, setFichaDe] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState(filtros.busqueda);
  const [busquedaDelServidor, setBusquedaDelServidor] = useState(filtros.busqueda);
  const temporizadorBusqueda = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* La búsqueda del servidor llega por la dirección, así que el campo se
     resincroniza cuando esa dirección cambia por fuera: atrás, adelante o un
     enlace compartido. Se ajusta durante el render y no en un efecto, que es la
     forma de no dibujar una vez con el valor viejo. */
  if (filtros.busqueda !== busquedaDelServidor) {
    setBusquedaDelServidor(filtros.busqueda);
    setBusqueda(filtros.busqueda);
  }

  /* El pedido sobrevive a la navegación y a una recarga. Con la paginación en
     el servidor eso dejó de ser una comodidad: cambiar de página o buscar es
     navegar, y sin esto el cliente perdería lo que ya había elegido. */
  if (montado && negocioLeido !== datos.negocio.id) {
    const guardado = leerPedidoGuardado(datos.negocio.id);
    setNegocioLeido(datos.negocio.id);
    setCantidades(guardado.cantidades);
    setElegidos(guardado.elegidos);
  }
  const productosPagina = useMemo(() => obtenerProductos(datos), [datos]);
  const productosCarrito = useMemo(() => Object.values(elegidos), [elegidos]);
  const productos = useMemo(() => {
    const porId = new Map(productosCarrito.map((producto) => [producto.id, producto]));
    for (const producto of productosPagina) porId.set(producto.id, producto);
    return [...porId.values()];
  }, [productosCarrito, productosPagina]);
  const cantidadEnCarrito = Object.values(cantidades).reduce(
    (total, cantidad) => total + cantidad,
    0,
  );
  /* Mientras la selección siga siendo la que se reservó, el acceso flotante
     sobra: el pedido ya está hecho y su código vive en el resumen. Si el
     cliente cambia una cantidad, la firma deja de coincidir y vuelve. */
  const hayReservaVigente =
    firmaReservada !== "" && firmaReservada === construirFirmaCarrito(cantidades);
  const totalEnCarrito = calcularSubtotal(
    productos
      .map((producto) => ({ precio: producto.precio, cantidad: cantidades[producto.id] ?? 0 }))
      .filter(({ cantidad }) => cantidad > 0),
  );
  const productosEnCarrito = productos.filter(
    (producto) => (cantidades[producto.id] ?? 0) > 0,
  ).length;
  const registrar = useCallback(
    (
      tipo: "vista_catalogo" | "clic_whatsapp" | "clic_producto",
      productoId: string | null = null,
    ) => registrarEventoAnalitica(datos.negocio.id, tipo, productoId),
    [datos.negocio.id],
  );

  useEffect(() => {
    registrar("vista_catalogo");
  }, [registrar]);

  useEffect(() => {
    if (negocioLeido !== datos.negocio.id) return;
    guardarPedido(datos.negocio.id, { cantidades, elegidos });
  }, [cantidades, datos.negocio.id, elegidos, negocioLeido]);

  useEffect(
    () => () => {
      if (temporizadorBusqueda.current) clearTimeout(temporizadorBusqueda.current);
    },
    [],
  );

  const irA = useCallback(
    (siguientes: Partial<FiltrosCatalogo>) => {
      router.push(construirRutaCatalogo(slug, { ...filtros, pagina: 1, ...siguientes }), {
        scroll: false,
      });
    },
    [filtros, router, slug],
  );
  /* La barra la dibuja la plantilla elegida, con su propia estructura; aqui
     solo viaja el estado que comparten. Antes esta pantalla inyectaba un
     desplegable generico y apagaba la barra de la plantilla, de modo que lo
     publicado no se parecia a la vista previa del panel. */
  const navegacion = {
    categorias: categoriasNavegacion,
    activa: filtros.categoria,
    totalProductos,
    alElegir: (categoriaId: string) => irA({ categoria: categoriaId }),
    busqueda,
    alBuscar: (termino: string) => {
      setBusqueda(termino);
      if (temporizadorBusqueda.current) clearTimeout(temporizadorBusqueda.current);
      temporizadorBusqueda.current = setTimeout(
        () => irA({ busqueda: termino }),
        ESPERA_BUSQUEDA,
      );
    },
  };

  function cambiarCantidad(productoId: string, cantidad: number) {
    const producto = productos.find(({ id }) => id === productoId);
    if (!producto) return;
    setCantidades((actuales) => {
      const siguientes = { ...actuales };
      if (cantidad <= 0) delete siguientes[productoId];
      else siguientes[productoId] = limitarCantidadReserva(cantidad, producto.maximoCantidad);
      return siguientes;
    });
    setElegidos((actuales) => {
      if (cantidad <= 0) {
        const siguientes = { ...actuales };
        delete siguientes[productoId];
        return siguientes;
      }
      return { ...actuales, [productoId]: producto };
    });
  }

  /* La ficha se busca entre lo elegido además de la página: si el cliente
     agregó algo y después buscó otra cosa, la ventana sigue abriendo bien. */
  const productoEnFicha =
    productos.find(({ id }) => id === fichaDe) ?? null;

  function agregarProducto(productoId: string) {
    registrar("clic_producto", productoId);
    cambiarCantidad(productoId, (cantidades[productoId] ?? 0) + 1);
  }

  return (
    <div
      className={`${temaStyles.tema} ${styles.contenedor}`}
      data-acceso-carrito={cantidadEnCarrito > 0 ? "si" : undefined}
      data-paleta={paleta}
      /* Sin atributo no hay patron: apagarlo es no ponerlo, no pintar encima. */
      data-patron={datos.negocio.patronFondo ? patronDeRubro(datos.negocio.rubro) : undefined}
    >
      <ColorNavegador paleta={paleta} />
      <PlantillaMipuesto
        alAgregarProducto={agregarProducto}
        alAbrirWhatsapp={(productoId) => registrar("clic_whatsapp", productoId)}
        alVerProducto={setFichaDe}
        cantidadesCarrito={cantidades}
        datos={datos}
        demostracion={false}
        navegacion={categoriasNavegacion.length > 0 ? navegacion : undefined}
        paleta={paleta}
      />
      <HojaProducto
        alAgregarProducto={agregarProducto}
        alAbrirWhatsapp={(productoId) => registrar("clic_whatsapp", productoId)}
        cantidad={productoEnFicha ? (cantidades[productoEnFicha.id] ?? 0) : 0}
        modalidad={datos.negocio.modalidad}
        onCerrar={() => setFichaDe(null)}
        paleta={paleta}
        permiteAcciones={datos.negocio.atencion.permiteAcciones}
        producto={productoEnFicha}
        slug={slug}
      />
      {totalProductos === 0 && filtros.busqueda.trim() ? (
        <p className={styles.sinResultados} role="status">
          No encontramos «{filtros.busqueda.trim()}». Probá con otra palabra o mirá todo
          el catálogo.
        </p>
      ) : null}
      {/* Las páginas son enlaces y no botones: así se pueden compartir, abrir en
          otra pestaña y quedar en el historial. */}
      {totalPaginas > 1 ? (
        <nav aria-label="Páginas de productos" className={styles.paginacion}>
          {filtros.pagina > 1 ? (
            <Link
              href={construirRutaCatalogo(slug, { ...filtros, pagina: filtros.pagina - 1 })}
              scroll={false}
            >
              Anterior
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
          <span>
            Página {filtros.pagina} de {totalPaginas}
          </span>
          {filtros.pagina < totalPaginas ? (
            <Link
              href={construirRutaCatalogo(slug, { ...filtros, pagina: filtros.pagina + 1 })}
              scroll={false}
            >
              Siguiente
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
        </nav>
      ) : null}
      {datos.negocio.modalidad === "carrito" ? (
        <>
          <HojaCatalogo
            abierta={pedidoAbierto}
            onCerrar={() => setPedidoAbierto(false)}
            paleta={paleta}
            titulo="Tu pedido"
          >
            <CarritoCatalogo
              cantidades={cantidades}
              datos={datos}
              onCambiarCantidad={cambiarCantidad}
              /* Acá se vacía el carrito, y no al reservar. Entre reservar y
                 abrir WhatsApp el comprador todavía puede corregir algo; una vez
                 que se fue con su código, lo que había en el carrito ya es un
                 pedido y dejarlo lleno hace que al volver parezca que no pasó
                 nada. El resumen con el código sigue en pantalla porque el
                 carrito sabe distinguir «vacío» de «vacío porque ya pidió». */
              onAbrirWhatsapp={() => {
                registrar("clic_whatsapp");
                setCantidades({});
                setElegidos({});
                setFirmaReservada("");
              }}
              onPedidoReservado={(firma) => {
                setFirmaReservada(firma);
                router.refresh();
              }}
              productos={productosCarrito}
            />
          </HojaCatalogo>
          {cantidadEnCarrito > 0 && !hayReservaVigente ? (
            <button
              aria-label={`Ver pedido: ${cantidadEnCarrito} ${cantidadEnCarrito === 1 ? "artículo" : "artículos"}, subtotal ${formatearPrecioBolivianos(totalEnCarrito)}`}
              className={styles.accesoCarrito}
              onClick={() => setPedidoAbierto(true)}
              type="button"
            >
              <span aria-hidden="true" className={styles.contadorCarrito}>
                {cantidadEnCarrito}
              </span>
              <span className={styles.textoCarrito}>
                <strong>Ver pedido</strong>
                <small>
                  {productosEnCarrito === 1 ? "1 producto" : `${productosEnCarrito} productos`}
                  {", "}
                  {cantidadEnCarrito === 1 ? "1 unidad" : `${cantidadEnCarrito} unidades`}
                </small>
              </span>
              <span className={styles.totalCarrito}>
                {formatearPrecioBolivianos(totalEnCarrito)}
              </span>
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
