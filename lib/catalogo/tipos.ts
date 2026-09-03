export type CategoriaCatalogo = {
  id: string;
  nombre: string;
  orden: number;
};

export type SubcategoriaCatalogo = {
  id: string;
  categoria_id: string;
  nombre: string;
  orden: number;
};

export type ProductoCatalogo = {
  id: string;
  codigo: string;
  categoria_id: string | null;
  subcategoria_id: string | null;
  nombre: string;
  descripcion: string | null;
  precio: number;
  precio_anterior: number | null;
  precio_actualizado_en: string | null;
  precio_actualizado_por: string | null;
  fotos: string[];
  controla_stock: boolean;
  cantidad_stock: number | null;
  cantidad_reservada: number;
  visible: boolean;
  estado: string;
  orden: number;
};

export type DatosProductoEntrada = {
  nombre: string;
  descripcion: string | null;
  precio: number;
  categoria_id: string | null;
  subcategoria_id: string | null;
  controla_stock: boolean;
  cantidad_stock: number | null;
};

export type DatosCatalogoAdmin = {
  negocio: {
    id: string;
    nombre: string;
    slug: string;
  };
  categorias: CategoriaCatalogo[];
  subcategorias: SubcategoriaCatalogo[];
  productos: ProductoCatalogo[];
};
