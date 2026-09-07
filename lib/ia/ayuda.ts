/* Las indicaciones viven en código y no escritas en el JSX de cada pantalla
   porque son parte del producto: si la herramienta falla, casi siempre es
   porque la foto no cumple alguna de estas condiciones, y el texto es lo único
   que lo evita antes de gastar un crédito.

   Están escritas para alguien que vende en un mercado, no para alguien que sabe
   qué es un modelo de visión. */

export const AYUDA_LISTA = {
  titulo: "Cómo sacar la foto de tu lista",
  pasos: [
    "Apoyá la lista en una superficie plana y sacá la foto desde arriba, no de costado.",
    "Que se vean los cuatro bordes de la hoja y que quede derecha.",
    "Buena luz, sin sombra encima y sin flash que rebote en el papel.",
    "Si tu lista es larga, fotografiala por partes: media hoja por vez se lee mejor que la hoja entera.",
  ],
  funciona: [
    "Listas de precios impresas o tipeadas",
    "Cartas de restaurante",
    "Listas escritas a mano, si la letra se entiende",
    "El nombre y el precio en el mismo renglón",
  ],
  noFunciona: [
    "Fotos de la estantería o de la vitrina",
    "Precios sueltos sin el nombre al lado",
    "Letra que ni vos podés leer en la foto",
    "Categorías, descripciones o fotografías de cada producto",
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
      { nombre: "Silpancho", precio: "Bs 38" },
      { nombre: "Pique macho grande", precio: "Bs 60" },
      { nombre: "Pique macho chico", precio: "Bs 35" },
      { nombre: "Refresco (por 2)", precio: "Bs 15" },
      { nombre: "Postre del día", precio: "Bs 10" },
    ],
    nota: "«ALMUERZOS» no aparece: es un título, no un producto.",
  },
};

export const AYUDA_PRODUCTO = {
  titulo: "Cómo sacar la foto del producto",
  pasos: [
    "Un solo producto por foto, centrado y de cerca.",
    "Fondo liso si podés: una mesa, una pared, una bandeja.",
    "Buena luz. La foto que ya subís al catálogo sirve igual.",
  ],
  advertencia:
    "Escribe el nombre y la descripción. El precio nunca: ninguna foto sabe cuánto cobrás vos.",
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
