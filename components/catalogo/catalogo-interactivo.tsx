"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";

import type { PaletaId, PlantillaId } from "../../lib/apariencia";
import { registrarEventoAnalitica } from "../../lib/analitica-cliente";
import { paginarCatalogo } from "../../lib/catalogo/paginacion";
import { construirFirmaCarrito } from "../../lib/pedidos/firma";
import { calcularSubtotal, formatearPrecioBolivianos } from "../../lib/precios";
import type {
  DatosPlantilla,
  ProductoPlantilla,
  PropiedadesPlantilla,
} from "../../lib/plantillas/tipos";
import { limitarCantidadReserva } from "../../lib/reservas";
import { CarritoCatalogo } from "../carrito/carrito-catalogo";
import { Esqueleto } from "../ui";
import temaStyles from "../templates/tema-catalogo.module.css";
import styles from "./catalogo-interactivo.module.css";

type PropiedadesCatalogoInteractivo = {
  datos: DatosPlantilla;
  plantilla: PlantillaId;
  paleta: PaletaId;
};

/* La plantilla llega en su propio chunk. En una conexion lenta ese hueco es
   justo lo primero que ve el cliente, asi que reservamos su alto. */
function CatalogoCargando() {
  return (
    <div aria-hidden="true" className={styles.cargando}>
      <Esqueleto variante="imagen" />
      <Esqueleto variante="titulo" />
      <Esqueleto />
      <Esqueleto />
    </div>
  );
}

const VISTAS: Record<PlantillaId, ComponentType<PropiedadesPlantilla>> = {
  clasica: dynamic(
    () =>
      import("../templates/clasica/plantilla-clasica").then(
        (modulo) => modulo.PlantillaClasica,
      ),
    { loading: CatalogoCargando },
  ),
  moderna: dynamic(
    () =>
      import("../templates/moderna/plantilla-moderna").then(
        (modulo) => modulo.PlantillaModerna,
      ),
    { loading: CatalogoCargando },
  ),
  minimal: dynamic(
    () =>
      import("../templates/minimal/plantilla-minimal").then(
        (modulo) => modulo.PlantillaMinimal,
      ),
    { loading: CatalogoCargando },
  ),
};

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
  plantilla,
  paleta,
}: PropiedadesCatalogoInteractivo) {
  const router = useRouter();
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [firmaReservada, setFirmaReservada] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("");
  const [pagina, setPagina] = useState(1);
  const productos = useMemo(() => obtenerProductos(datos), [datos]);
  const paginaCatalogo = useMemo(
    () => paginarCatalogo(datos.categorias, categoriaActiva, pagina),
    [categoriaActiva, datos.categorias, pagina],
  );
  const datosPaginados = useMemo(
    () => ({ ...datos, categorias: paginaCatalogo.categorias }),
    [datos, paginaCatalogo.categorias],
  );
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
  const Vista = VISTAS[plantilla];
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
  /* La barra la dibuja la plantilla elegida, con su propia estructura; aqui
     solo viaja el estado que comparten. Antes esta pantalla inyectaba un
     desplegable generico y apagaba la barra de la plantilla, de modo que lo
     publicado no se parecia a la vista previa del panel. */
  const navegacion = {
    categorias: datos.categorias.map(({ id, nombre }) => ({ id, nombre })),
    activa: categoriaActiva,
    totalProductos: paginaCatalogo.totalProductos,
    alElegir: (categoriaId: string) => {
      setCategoriaActiva(categoriaId);
      setPagina(1);
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
    >
      <Vista
        alAgregarProducto={agregarProducto}
        alAbrirWhatsapp={(productoId) => registrar("clic_whatsapp", productoId)}
        cantidadesCarrito={cantidades}
        datos={datosPaginados}
        demostracion={false}
        navegacion={datos.categorias.length > 0 ? navegacion : undefined}
        paleta={paleta}
      />
      {paginaCatalogo.totalPaginas > 1 ? (
        <nav
          aria-label="Páginas de productos"
          className={styles.paginacion}
        >
          <button
            disabled={paginaCatalogo.pagina === 1}
            onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
            type="button"
          >
            Anterior
          </button>
          <span>
            Página {paginaCatalogo.pagina} de {paginaCatalogo.totalPaginas}
          </span>
          <button
            disabled={paginaCatalogo.pagina === paginaCatalogo.totalPaginas}
            onClick={() =>
              setPagina((actual) => Math.min(paginaCatalogo.totalPaginas, actual + 1))
            }
            type="button"
          >
            Siguiente
          </button>
        </nav>
      ) : null}
      {datos.negocio.modalidad === "carrito" ? (
        <>
          <CarritoCatalogo
            cantidades={cantidades}
            datos={datos}
            onCambiarCantidad={cambiarCantidad}
            onAbrirWhatsapp={() => registrar("clic_whatsapp")}
            onPedidoReservado={(firma) => {
              setFirmaReservada(firma);
              router.refresh();
            }}
            paleta={paleta}
            productos={productos}
          />
          {cantidadEnCarrito > 0 && !hayReservaVigente ? (
            <a
              aria-label={`Ver pedido: ${cantidadEnCarrito} ${cantidadEnCarrito === 1 ? "artículo" : "artículos"}, subtotal ${formatearPrecioBolivianos(totalEnCarrito)}`}
              className={styles.accesoCarrito}
              href="#resumen-pedido"
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
            </a>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
