/* Los errores de `crear_pedido_reservado`, dichos para quien pide.
 *
 * La base decide y lanza un código; acá se traduce. **Cada código que lanza la
 * función tiene que estar en esta lista**, y `errores-pedido.test.ts` lo
 * comprueba leyendo la última migración que la define: el 2026-09-24 faltaban
 * NOMBRE_INVALIDO y PEDIDO_INVALIDO, caían en el 500 genérico —«No se pudo
 * reservar el pedido»— y el carrito, además, lo reintentaba como si fuera un
 * corte.
 */

export const ERRORES_PEDIDO: Record<string, { estado: number; mensaje: string }> = {
  NEGOCIO_NO_DISPONIBLE: {
    estado: 404,
    mensaje: "Este negocio no está disponible para recibir pedidos.",
  },
  MODALIDAD_NO_PERMITE_PEDIDOS: {
    estado: 409,
    mensaje: "Este catálogo no usa pedidos con carrito.",
  },
  PRODUCTO_NO_DISPONIBLE: {
    estado: 409,
    mensaje: "Uno de los productos ya no está disponible. Actualiza el catálogo.",
  },
  /* Fase 13. Llegan cuando el catálogo que tiene abierto el comprador es
     anterior a un cambio del dueño: una talla nueva, una que se ocultó. */
  PRESENTACION_REQUERIDA: {
    estado: 409,
    mensaje: "Elige la talla, el número o el tamaño de cada producto antes de enviar el pedido.",
  },
  PRESENTACION_NO_DISPONIBLE: {
    estado: 409,
    mensaje: "Una de las opciones que elegiste ya no está disponible. Actualiza el catálogo.",
  },
  STOCK_INSUFICIENTE: {
    estado: 409,
    mensaje: "Cambió la cantidad disponible. Revisa tu pedido e intenta nuevamente.",
  },
  /* El máximo de unidades que puso el dueño. El carrito ya avisa antes de
     enviar; esto llega si el dueño lo bajó con el catálogo abierto. */
  TOPE_UNIDADES: {
    estado: 409,
    mensaje:
      "Tu pedido pasa el máximo de unidades que acepta este negocio. Quita algunas e intenta nuevamente.",
  },
  LIMITE_PEDIDOS: {
    estado: 429,
    mensaje: "Llegaste al límite temporal de pedidos. Intenta nuevamente en 15 minutos.",
  },
  /* Solo por largo: el nombre es opcional. Hasta el 2026-09-24 faltaba acá, y
     un nombre de más terminaba en el 500 genérico. */
  NOMBRE_INVALIDO: {
    estado: 400,
    mensaje: "El nombre admite hasta 80 caracteres.",
  },
  /* Un pedido que la base no puede leer: renglones repetidos, cantidades fuera
     de rango. Con el carrito normal no pasa; si pasa, recargar lo arregla. */
  PEDIDO_INVALIDO: {
    estado: 400,
    mensaje: "No pudimos leer tu pedido. Recarga la página e inténtalo de nuevo.",
  },
  TELEFONO_INVALIDO: {
    estado: 400,
    mensaje: "Escribe un celular boliviano válido de 8 dígitos.",
  },
  MESA_NO_PERMITIDA: {
    estado: 400,
    mensaje: "Este negocio no atiende por mesa.",
  },
  MESA_INVALIDA: {
    estado: 400,
    mensaje: "El número de mesa admite hasta 10 caracteres.",
  },
};

const ERROR_DESCONOCIDO = {
  estado: 500,
  mensaje: "No se pudo reservar el pedido. Intenta nuevamente.",
};

export function responderErrorPedido(mensajeDeLaBase: string): { estado: number; mensaje: string } {
  const coincidencia = Object.entries(ERRORES_PEDIDO).find(([codigo]) =>
    mensajeDeLaBase.includes(codigo),
  );
  if (coincidencia) {
    /* El tope por IP se anota: es la forma de saber si quince alcanza o si deja
       afuera a clientes reales detrás de la misma IP de una red móvil. */
    if (coincidencia[0] === "LIMITE_PEDIDOS") console.warn("Tope de pedidos por IP alcanzado.");
    return coincidencia[1];
  }
  /* Un error que no está en la lista se anota: sin esto, el de hoy se habría
     visto solo como un 500 sin causa en el registro del Worker. */
  console.error(`crear_pedido_reservado devolvió un error sin traducir: ${mensajeDeLaBase}`);
  return ERROR_DESCONOCIDO;
}
