/* Las indicaciones viven en código y no escritas en el JSX de cada pantalla
   porque son parte del producto: si la herramienta falla, casi siempre es
   porque la foto no cumple alguna de estas condiciones, y el texto es lo único
   que lo evita antes de gastar un crédito.

   Están escritas para alguien que vende en un mercado, no para alguien que sabe
   qué es un modelo de visión. */

/* Lo que se le dice a quien va a elegir una foto para leer, en las dos
   herramientas. Mientras se use el nivel gratuito de Google, lo enviado puede
   usarse para mejorar sus productos: que no salga nada que no sea un producto
   o una lista de precios. El detalle, en la política de privacidad. */
export const AVISO_PRIVACIDAD_IA =
  "Las fotos que elijas las lee Google. Fotografía solo productos y listas de precios: nada de documentos, rostros ni datos de tus clientes.";

export const AYUDA_LISTA = {
  titulo: "Cómo mandar tu lista",
  /* El PDF va primero y con su propio renglón porque es el mejor caso y casi
     nadie lo supone: la lista que mandó el proveedor por WhatsApp se lee mejor
     que cualquier fotografía, porque el texto ya está escrito adentro del
     archivo y no hay sombra, ángulo ni enfoque que puedan salir mal. */
  pasos: [
    "¿Tienes la lista en PDF, la que te mandó tu proveedor? Súbela así: se lee mejor que una foto.",
    "Si vas a fotografiarla, apoya la hoja en una superficie plana y saca la foto desde arriba, no de costado.",
    "Que se vean los cuatro bordes de la hoja y que quede derecha, con buena luz y sin flash que rebote.",
    "Si tu lista es larga, mandala por partes: media hoja por vez se lee mejor que la hoja entera.",
  ],
  funciona: [
    "PDF de listas de precios, el del proveedor incluido",
    "Fotos de listas impresas o tipeadas",
    "Cartas de restaurante",
    "Listas escritas a mano, si la letra se entiende",
    "El nombre y el precio en el mismo renglón",
    "Títulos de sección: los usamos como tus categorías",
    "Detalles del plato, si están escritos al lado del nombre",
  ],
  noFunciona: [
    "Fotos de la estantería o de la vitrina",
    "Precios sueltos sin el nombre al lado",
    "Letra que ni vos puedes leer en la foto",
    "Fotografías de cada producto: esas las subes vos",
    "Cantidades en stock: eso lo sabes vos, no la lista",
    "PDF de más de 4 MB: sube tu lista por páginas",
  ],
  /* El ejemplo va con los casos raros de verdad —«2x15», dos tamaños, el título
     de sección— porque son los que hacen dudar al comerciante de si va a
     funcionar con su lista, que nunca es la lista limpia del manual. */
  ejemplo: {
    titulo: "Un ejemplo de lo que entiende",
    entrada: [
      "ALMUERZOS",
      "Silpancho ................ 38",
      "Pique macho grande/chico .. 60/35",
      "Refresco 2x15",
      "Postre del día .......... Bs 10.-",
    ],
    salida: [
      { nombre: "Silpancho", precio: "Bs 38", categoria: "Almuerzos" },
      { nombre: "Pique macho grande", precio: "Bs 60", categoria: "Almuerzos" },
      { nombre: "Pique macho chico", precio: "Bs 35", categoria: "Almuerzos" },
      { nombre: "Refresco (por 2)", precio: "Bs 15", categoria: "Almuerzos" },
      { nombre: "Postre del día", precio: "Bs 10", categoria: "Almuerzos" },
    ],
    nota: "«ALMUERZOS» no se convierte en un producto: se convierte en la categoría de los que vienen debajo.",
  },
};

export const AYUDA_PRODUCTO = {
  titulo: "Cómo sacar la foto del producto",
  pasos: [
    "Un solo producto por foto, centrado y de cerca.",
    "Fondo liso si puedes: una mesa, una pared, una bandeja.",
    "Buena luz. La foto que ya subes al catálogo sirve igual.",
  ],
  advertencia:
    "La herramienta escribe el nombre y la descripción, y la foto queda como imagen del producto. El precio nunca: ninguna foto sabe cuánto cobras vos.",
  ejemplo: {
    entrada: "Foto de un plato de hamburguesa con papas",
    nombre: "Hamburguesa doble con queso",
    descripcion: "Jugosa hamburguesa doble con queso fundido, lechuga fresca y tomate en pan suave.",
  },
};

/* El cartel de «función nueva» vive siete días desde que se habilitó y después
   desaparece solo. Sin columna de «visto» que mantener: un cartel que se apaga
   con el tiempo no necesita que nadie lo cierre, y el que hay que cerrar termina
   cerrado sin leerse.

   Vive acá y no en la página para que la comparación con el reloj quede en una
   función que se puede probar con una fecha fija. */
export const DIAS_DE_AVISO_FOTO = 7;

export function esAvisoDeFotoReciente(
  habilitadaEn: string | null | undefined,
  ahora: Date = new Date(),
): boolean {
  if (!habilitadaEn) return false;
  const desde = new Date(habilitadaEn).getTime();
  if (Number.isNaN(desde)) return false;
  const dias = (ahora.getTime() - desde) / 86_400_000;
  return dias >= 0 && dias < DIAS_DE_AVISO_FOTO;
}
