"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type ComponentType } from "react";

import type { PaletaId, PlantillaId } from "../../lib/apariencia";
import { paginarCatalogo } from "../../lib/catalogo/paginacion";
import type {
  DatosPlantilla,
  ProductoPlantilla,
  PropiedadesPlantilla,
} from "../../lib/plantillas/tipos";
import { limitarCantidadReserva } from "../../lib/reservas";
import { CarritoCatalogo } from "../carrito/carrito-catalogo";
import temaStyles from "../templates/tema-catalogo.module.css";
import styles from "./catalogo-interactivo.module.css";

type PropiedadesCatalogoInteractivo = {
  datos: DatosPlantilla;
  plantilla: PlantillaId;
  paleta: PaletaId;
};

const VISTAS: Record<PlantillaId, ComponentType<PropiedadesPlantilla>> = {
  clasica: dynamic(() =>
    import("../templates/clasica/plantilla-clasica").then(
      (modulo) => modulo.PlantillaClasica,
    ),
  ),
  moderna: dynamic(() =>
    import("../templates/moderna/plantilla-moderna").then(
      (modulo) => modulo.PlantillaModerna,
    ),
  ),
  minimal: dynamic(() =>
    import("../templates/minimal/plantilla-minimal").then(
      (modulo) => modulo.PlantillaMinimal,
    ),
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
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
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
  const Vista = VISTAS[plantilla];
  const navegacionCatalogo = datos.categorias.length > 0 ? (
    <section aria-labelledby="explorar-catalogo" className={styles.explorador}>
      <div>
        <label htmlFor="categoria-catalogo" id="explorar-catalogo">
          Categoría
        </label>
        <select
          id="categoria-catalogo"
          onChange={(evento) => {
            setCategoriaActiva(evento.target.value);
            setPagina(1);
          }}
          value={categoriaActiva}
        >
          <option value="">Todas las categorías</option>
          {datos.categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nombre}
            </option>
          ))}
        </select>
      </div>
      <p>
        {paginaCatalogo.totalProductos === 1
          ? "1 producto"
          : `${paginaCatalogo.totalProductos} productos`}
      </p>
    </section>
  ) : null;

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
    cambiarCantidad(productoId, (cantidades[productoId] ?? 0) + 1);
  }

  return (
    <div
      className={`${temaStyles.tema} ${styles.contenedor}`}
      data-paleta={paleta}
    >
      <Vista
        alAgregarProducto={agregarProducto}
        cantidadesCarrito={cantidades}
        datos={datosPaginados}
        demostracion={false}
        navegacionCatalogo={navegacionCatalogo}
        ocultarNavegacionCategorias
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
            paleta={paleta}
            productos={productos}
          />
          {cantidadEnCarrito > 0 ? (
            <a
              aria-label={`Ver pedido con ${cantidadEnCarrito} artículo${cantidadEnCarrito === 1 ? "" : "s"}`}
              className={styles.accesoCarrito}
              href="#resumen-pedido"
            >
              <span>Ver pedido</span>
              <small>
                {cantidadEnCarrito} {cantidadEnCarrito === 1 ? "artículo" : "artículos"}
              </small>
            </a>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
