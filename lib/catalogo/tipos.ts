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
  /* Quién atiende este servicio. Nulo en productos que venden cosas. */
  recurso_id: string | null;
  /* Cuánto dura este servicio, si su categoría vende tiempo. Nulo significa «la
     de su categoría», que es lo normal: el dueño solo la escribe donde de verdad
     es distinta. */
  duracion_minutos: number | null;
  /* Si lleva presentaciones (talla, número, tamaño). Lo calcula la base. Con
     presentaciones y control de existencias, las existencias viven en cada una
     y las del producto quedan en nulo (fase 13). */
  con_presentaciones: boolean;
  tipo_presentacion: "talla" | "numero" | "tamano" | "presentacion";
};

export type DatosProductoEntrada = {
  nombre: string;
  descripcion: string | null;
  precio: number;
  categoria_id: string | null;
  subcategoria_id: string | null;
  controla_stock: boolean;
  cantidad_stock: number | null;
  duracion_minutos: number | null;
  recurso_id: string | null;
};

export type DatosCatalogoAdmin = {
  negocio: {
    id: string;
    nombre: string;
    slug: string;
    rubro: string | null;
    /* Lo que vende, dicho como lo busca el cliente, y hasta dos rubros más.
       Deciden los ejemplos del catálogo; nunca permisos ni datos. */
    rubro_publico: string | null;
    rubros_secundarios: string[];
    /* Obligatorio a propósito, aunque el valor pueda ser falso.
       Era opcional, y por eso una consulta que dejó de pedirlo compiló igual:
       el formulario de producto se quedó sin su bloque de lectura con foto y no
       protestó nadie. Un campo que una pantalla necesita para dibujarse no es
       opcional; que el dato sea `false` es otra cosa. */
    foto_ia_habilitada: boolean;
    /* Qué plan paga, y por lo tanto cuántas lecturas tiene. Obligatorio por el
       mismo motivo que el de arriba: el formulario dice «te quedan X de Y», y si
       una consulta deja de pedirlo ese Y vuelve a ser un número que no es el
       suyo. */
    plan_id: string;
  };
  /* Cuántas lecturas con IA lleva el negocio este mes. Va al lado de la
     herramienta, en el formulario de producto: quien está por usarla es quien
     tiene que saber cuántas le quedan, y no se entera abriendo otra pantalla. */
  fotosUsadasMes: number;
  /* Lo que ocupan las fotos del negocio, en bytes; `null` si no se pudo saber.
     El formulario lo muestra junto a las fotos y avisa antes del tope. */
  espacioUsado: number | null;
  categorias: CategoriaCatalogo[];
  subcategorias: SubcategoriaCatalogo[];
  productos: ProductoCatalogo[];
  /* Quién atiende: los recursos del negocio, para que un servicio elija el suyo. */
  recursos: Array<{ id: string; nombre: string; activo: boolean }>;
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
