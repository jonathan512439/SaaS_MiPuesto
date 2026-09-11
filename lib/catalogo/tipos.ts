export type CategoriaCatalogo = {
  id: string;
  nombre: string;
  orden: number;
  /* El dibujo de su esfera. Se lee como texto y no como el tipo estricto del
     juego de íconos: viene de la base, donde pudo guardarse uno que después se
     quitó, y `normalizarIcono` es quien decide qué se dibuja. */
  icono: string;
  /* Si su esfera aparece en la navegación del catálogo. No oculta los
     productos: es para el negocio con doce categorías que quiere seis accesos
     rápidos arriba. */
  visible: boolean;
  /* `cosas` o `tiempo`. Decide si la categoría tendrá variantes y existencias o
     agenda y citas. */
  vende: string;
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
  en_carta_hasta: string | null;
  /* Los valores de los campos de su categoría, por clave. Se lee como `unknown`
     y no con un tipo cerrado: lo que hay en esa columna lo interpreta
     `lib/catalogo/valores.ts` con las definiciones al lado, y declararlo acá
     sería afirmar sobre datos que todavía no se validaron. */
  atributos: unknown;
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
    rubro: string | null;
    foto_ia_habilitada?: boolean;
  };
  categorias: CategoriaCatalogo[];
  subcategorias: SubcategoriaCatalogo[];
  productos: ProductoCatalogo[];
  /* Las definiciones de campos de todas las categorías, tal como vienen de la
     base. Se agrupan en el cliente: son diez filas por categoría y el formulario
     necesita cambiar de conjunto en cuanto el dueño elige otra categoría. */
  atributos: Array<{
    categoria_id: string;
    clave: string;
    nombre: string;
    tipo: string;
    unidad: string | null;
    opciones: string[];
    obligatorio: boolean;
    en_tarjeta: boolean;
    en_resumen: boolean;
    orden: number;
  }>;
};
