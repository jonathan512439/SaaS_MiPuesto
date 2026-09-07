import { PRECIO_MENSUAL_BS } from "./contacto";
import { TOPE_FOTOS_POR_MES } from "./ia/limites";

/* Los planes, en un solo lugar.
 *
 * El cupo de lecturas de cada plan sale de acá y es el mismo número que aplica
 * el sistema: si la portada promete sesenta y la base autoriza otra cosa, el
 * reclamo llega por WhatsApp y con razón.
 *
 * El precio va en bolivianos porque es lo que paga el cliente. Los costos del
 * servicio están en dólares, así que el margen se mueve con el tipo de cambio:
 * eso se revisa una vez al año, no plan por plan.
 */
export type Plan = {
  id: "catalogo" | "activo";
  nombre: string;
  precioBs: number;
  /* Lecturas de foto incluidas por mes. Cero sería un plan sin la herramienta;
     hoy los dos la traen, porque una función que el dueño nunca puede tocar es
     una función que nunca va a comprar. */
  lecturasPorMes: number;
  para: string;
  destacado: boolean;
  incluye: readonly string[];
};

export const PLANES: readonly Plan[] = [
  {
    id: "catalogo",
    nombre: "Catálogo",
    precioBs: PRECIO_MENSUAL_BS,
    lecturasPorMes: 10,
    para: "Para la mayoría: un catálogo que se arma una vez y se retoca de vez en cuando.",
    destacado: false,
    incluye: [
      "Tu dirección web propia y tu código QR",
      "Hasta 300 productos con fotos",
      "Pedidos que se cierran por WhatsApp",
      "Cuatro diseños y siete paletas de color",
      "Tu negocio en el directorio público",
      "10 lecturas de foto al mes",
    ],
  },
  {
    id: "activo",
    nombre: "Catálogo Activo",
    precioBs: 120,
    lecturasPorMes: 60,
    para: "Para quien cambia mercadería seguido: ropa por temporada, ferretería, tienda que rota proveedores.",
    destacado: true,
    incluye: [
      "Todo lo del plan Catálogo",
      "60 lecturas de foto al mes",
      "Prioridad cuando escribís por WhatsApp",
    ],
  },
];

/* Se cobra una vez y no todos los meses porque el trabajo se hace una vez. Un
   restaurante carga su carta al principio y después suma tres platos al mes:
   cobrarle todos los meses por eso es la forma más rápida de perderlo en el
   tercero. */
export const CARGA_INICIAL = {
  precioBs: 250,
  productosMaximos: 150,
} as const;

/* El tope técnico por negocio, que ningún plan puede superar. Está acá para que
   se vea que los cupos de arriba caben dentro de él. */
export const TOPE_TECNICO_MENSUAL = TOPE_FOTOS_POR_MES;
