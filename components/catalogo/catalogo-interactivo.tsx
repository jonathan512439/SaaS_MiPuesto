"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PaletaId } from "../../lib/apariencia";
import { fusionarCategorias } from "../../lib/plantillas/fusionar";
import type { CategoriaPlantilla } from "../../lib/plantillas/tipos";
import { registrarEventoAnalitica } from "../../lib/analitica-cliente";
import {
  construirRutaCatalogo,
  type FiltrosCatalogo,
} from "../../lib/catalogo/consulta-publica";
import { construirFirmaCarrito } from "../../lib/pedidos/firma";
import { usePedido } from "../../lib/pedidos/use-pedido";
import { calcularSubtotal, formatearPrecioBolivianos } from "../../lib/precios";
import type { DatosPlantilla, ProductoPlantilla } from "../../lib/plantillas/tipos";
import { CarritoCatalogo } from "../carrito/carrito-catalogo";
import { HojaCatalogo } from "./hoja-catalogo";
import { PlantillaMipuesto } from "../templates/mipuesto/plantilla-mipuesto";
import { ColorNavegador } from "./color-navegador";
import temaStyles from "../templates/tema-catalogo.module.css";
import styles from "./catalogo-interactivo.module.css";
import { iconosDePatron, patronDeRubro } from "../../lib/patrones-fondo";

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
  /* El pedido no vive acá: lo lleva `usarPedido`, que es el mismo que usa la
     página del producto. Desde que tocar una tarjeta lleva a esa página, el
     cliente puede agregar desde las dos, y con dos copias de esta lógica el
     mismo pedido terminaría diciendo dos cosas. */
  const { cantidades, elegidos, cambiarCantidad: cambiarPedido, vaciar } = usePedido(
    datos.negocio.id,
  );
  const [firmaReservada, setFirmaReservada] = useState("");
  const [pedidoAbierto, setPedidoAbierto] = useState(false);
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

  const productosPagina = useMemo(() => obtenerProductos(datos), [datos]);

  /* Los tramos que se fueron trayendo al bajar, sumados al que vino dibujado.
     Arranca en el que sirvió la pantalla, así que sin JavaScript —o antes de que
     corra— el catálogo es exactamente el de siempre.

     Van los tres datos en un solo estado, y con la dirección que los produjo
     adentro. Una dirección nueva —otra categoría, otra búsqueda, otra página
     compartida— es **otro catálogo**: lo traído antes no tiene nada que ver y se
     descarta. Guardar de qué dirección viene lo acumulado es lo que permite
     darse cuenta, y hacerlo durante el dibujo y no en un efecto evita el paso
     intermedio en que la pantalla muestra los productos de la búsqueda
     anterior. */
  const direccionActual = `${filtros.pagina}|${filtros.categoria}|${filtros.busqueda}`;
  const [acumulado, setAcumulado] = useState({
    direccion: direccionActual,
    categorias: datos.categorias,
    ultimaTanda: filtros.pagina,
  });

  if (acumulado.direccion !== direccionActual) {
    setAcumulado({
      direccion: direccionActual,
      categorias: datos.categorias,
      ultimaTanda: filtros.pagina,
    });
  }

  const { categorias, ultimaTanda } = acumulado;
  const [trayendo, setTrayendo] = useState(false);
  const finDeLaLista = useRef<HTMLDivElement | null>(null);

  const hayMas = ultimaTanda < totalPaginas;

  useEffect(() => {
    const marca = finDeLaLista.current;
    if (!marca || !hayMas || trayendo) return;

    /* Se observa una marca al final de la lista en vez de escuchar el
       desplazamiento: el navegador avisa cuando aparece y no hay que calcular
       alturas en cada píxel que se mueve, que es lo que traba un teléfono. */
    const observador = new IntersectionObserver(
      (entradas) => {
        if (!entradas[0]?.isIntersecting) return;
        setTrayendo(true);

        const direccion = new URL(`/api/catalogo/${slug}/pagina`, window.location.origin);
        direccion.searchParams.set("pagina", String(ultimaTanda + 1));
        if (filtros.categoria) direccion.searchParams.set("categoria", filtros.categoria);
        if (filtros.busqueda) direccion.searchParams.set("busqueda", filtros.busqueda);

        fetch(direccion)
          .then((respuesta) => (respuesta.ok ? respuesta.json() : Promise.reject(respuesta)))
          .then((datosNuevos: { categorias: CategoriaPlantilla[] }) => {
            setAcumulado((previo) =>
              /* Si mientras tanto cambió la dirección, lo que llegó es de otro
                 catálogo y se tira: agregarlo mezclaría los productos de una
                 búsqueda con los de otra. */
              previo.direccion !== direccionActual
                ? previo
                : {
                    ...previo,
                    categorias: fusionarCategorias(previo.categorias, datosNuevos.categorias),
                    ultimaTanda: previo.ultimaTanda + 1,
                  },
            );
          })
          /* Si falla, se deja de intentar y quedan los enlaces de siempre: el
             visitante puede seguir a la página siguiente a mano. Insistir solo
             gastaría datos de su teléfono. */
          .catch(() =>
            setAcumulado((previo) => ({ ...previo, ultimaTanda: totalPaginas })),
          )
          .finally(() => setTrayendo(false));
      },
      /* Se pide con antelación, antes de que la marca se vea: así el tramo
         siguiente suele estar antes de que el visitante llegue al final, y lo
         que ve es un catálogo que no termina en vez de una espera. */
      { rootMargin: "600px" },
    );

    observador.observe(marca);
    return () => observador.disconnect();
  }, [direccionActual, filtros.busqueda, filtros.categoria, hayMas, slug, totalPaginas, trayendo, ultimaTanda]);
  const productosCarrito = Object.values(elegidos);
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

  /* El carrito de la hoja habla por identificador —es lo que tiene a mano en
     cada fila—, y el pedido guarda el producto entero. Acá se traduce de uno al
     otro, buscando entre lo de la página y lo ya elegido. */
  function cambiarCantidad(productoId: string, cantidad: number) {
    const producto = productos.find(({ id }) => id === productoId);
    if (!producto) return;
    cambiarPedido(producto, cantidad);
  }

  function agregarProducto(productoId: string) {
    registrar("clic_producto", productoId);
    cambiarCantidad(productoId, (cantidades[productoId] ?? 0) + 1);
  }

  return (
    <div
      className={`${temaStyles.tema} ${styles.contenedor}`}
      data-acceso-carrito={cantidadEnCarrito > 0 ? "si" : undefined}
      data-paleta={paleta}
      /* Sin atributo no hay patron: apagarlo es no ponerlo, no pintar encima.
         Y el de rubro es el de reserva: si el negocio tiene categorias propias,
         el fondo lo dibuja la plantilla con los iconos de esas categorias. */
      data-patron={
        datos.negocio.patronFondo && iconosDePatron(categoriasNavegacion).length === 0
          ? patronDeRubro(datos.negocio.rubro)
          : undefined
      }
      /* Y cuanto se nota. Va junto al patron y no por separado: sin patron, la
         opacidad no tiene sobre que actuar. */
      data-patron-opacidad={datos.negocio.patronFondo ? datos.negocio.patronOpacidad : undefined}
    >
      <ColorNavegador paleta={paleta} />
      <PlantillaMipuesto
        /* El paginador y el aviso de búsqueda sin resultados van adentro de la
           plantilla, justo antes del pie. Dibujados acá afuera quedaban
           **después** del pie: debajo de las redes del negocio y del enlace de
           MiPuesto, o sea al final de todo, donde nadie los busca. */
        antesDelPie={
          <>
          {totalProductos === 0 && filtros.busqueda.trim() ? (
            <p className={styles.sinResultados} role="status">
              No encontramos «{filtros.busqueda.trim()}». Probá con otra palabra o mirá todo
              el catálogo.
            </p>
          ) : null}
          {/* La marca que dispara el tramo siguiente. Va antes de los enlaces y
              no después: se quiere pedir lo que viene **mientras** el visitante
              mira los últimos productos, no cuando ya no tiene nada que mirar. */}
          <div aria-hidden="true" ref={finDeLaLista} />

          {trayendo ? (
            <p className={styles.trayendo} role="status">
              Trayendo más productos…
            </p>
          ) : null}

          {/* Las páginas son enlaces y no botones: así se pueden compartir, abrir en
              otra pestaña y quedar en el historial.
              Se dibujan siempre del lado del servidor —sin JavaScript el catálogo
              se recorre con ellos— y se retiran en cuanto el navegador trajo el
              primer tramo solo: a partir de ahí «Página 1 de 3» diría una cosa y
              la pantalla mostraría otra. */}
          {totalPaginas > 1 && ultimaTanda === filtros.pagina ? (
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
          </>
        }
        alAgregarProducto={agregarProducto}
        alAbrirWhatsapp={(productoId) => registrar("clic_whatsapp", productoId)}
        alVerProducto={(productoId) => registrar("clic_producto", productoId)}
        cantidadesCarrito={cantidades}
        datos={{ ...datos, categorias }}
        demostracion={false}
        navegacion={categoriasNavegacion.length > 0 ? navegacion : undefined}
        paleta={paleta}
      />
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
                vaciar();
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
