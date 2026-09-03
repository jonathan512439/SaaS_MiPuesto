import type { CategoriaPlantilla, ProductoPlantilla } from "../plantillas/tipos";

type ProductoUbicado = {
  categoriaId: string;
  subcategoriaId: string | null;
  producto: ProductoPlantilla;
};

export const PRODUCTOS_PUBLICOS_POR_PAGINA = 12;

function aplanarProductos(categorias: CategoriaPlantilla[]): ProductoUbicado[] {
  return categorias.flatMap((categoria) => [
    ...categoria.productos.map((producto) => ({
      categoriaId: categoria.id,
      subcategoriaId: null,
      producto,
    })),
    ...(categoria.subcategorias ?? []).flatMap((subcategoria) =>
      subcategoria.productos.map((producto) => ({
        categoriaId: categoria.id,
        subcategoriaId: subcategoria.id,
        producto,
      })),
    ),
  ]);
}

export function paginarCatalogo(
  categorias: CategoriaPlantilla[],
  categoriaId: string,
  paginaSolicitada: number,
  porPagina = PRODUCTOS_PUBLICOS_POR_PAGINA,
) {
  const categoriasFiltradas = categoriaId
    ? categorias.filter((categoria) => categoria.id === categoriaId)
    : categorias;
  const productos = aplanarProductos(categoriasFiltradas);
  const totalPaginas = Math.max(1, Math.ceil(productos.length / porPagina));
  const pagina = Math.min(Math.max(1, paginaSolicitada), totalPaginas);
  const seleccionados = productos.slice((pagina - 1) * porPagina, pagina * porPagina);
  const idsSeleccionados = new Set(seleccionados.map(({ producto }) => producto.id));

  const categoriasPaginadas = categoriasFiltradas
    .map((categoria) => ({
      ...categoria,
      productos: categoria.productos.filter((producto) => idsSeleccionados.has(producto.id)),
      subcategorias: (categoria.subcategorias ?? [])
        .map((subcategoria) => ({
          ...subcategoria,
          productos: subcategoria.productos.filter((producto) =>
            idsSeleccionados.has(producto.id),
          ),
        }))
        .filter((subcategoria) => subcategoria.productos.length > 0),
    }))
    .filter(
      (categoria) =>
        categoria.productos.length > 0 || (categoria.subcategorias?.length ?? 0) > 0,
    );

  return {
    categorias: categoriasPaginadas,
    pagina,
    totalPaginas,
    totalProductos: productos.length,
  };
}
