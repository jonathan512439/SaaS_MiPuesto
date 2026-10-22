import { PALETAS } from "./apariencia";
import { PRECIO_MENSUAL_BS } from "./contacto";
import { TOPE_FOTOS_POR_DIA, TOPE_FOTOS_POR_MES } from "./ia/limites";

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
/* El identificador que se guarda en `negocios.plan_id`. La restricción de la
   base lista los mismos tres valores; si acá aparece otro sin migración, la base
   lo rechaza al guardarlo. `prueba` es la prueba gratis (`PLAN_PRUEBA`): no se
   vende, así que no está en `PLANES`. */
export type PlanId = "prueba" | "catalogo" | "activo";

/* Cuánto puede cargar un negocio según su plan.
 *
 * **Lo hace cumplir la base**: `private.topes_del_plan` en la migración
 * `20261029090000_topes_de_productos_y_fotos_por_plan.sql` repite estos mismos
 * números, y `topes-del-plan.test.ts` compara los dos. Acá viven para que la
 * portada, los términos, el panel y la plataforma digan lo mismo que aplica el
 * sistema.
 *
 * Los productos en la papelera no cuentan. Quien baja de plan conserva lo que ya
 * cargó —nada se borra—: solo no puede agregar más hasta quedar debajo. */
export type TopesDelPlan = {
  productos: number;
  fotosPorProducto: number;
};

export type Plan = {
  id: PlanId;
  nombre: string;
  precioBs: number;
  topes: TopesDelPlan;
  /* Lecturas de foto incluidas por mes —en la prueba, en total—. Cero sería un
     plan sin la herramienta; hoy todos la traen, porque una función que el
     dueño nunca puede tocar es una función que nunca va a comprar. */
  lecturasPorMes: number;
  para: string;
  destacado: boolean;
  incluye: readonly string[];
};

/* En cuántos días puede gastarse el cupo del mes.
 *
 * Cuatro, no uno y no treinta. Uno dejaría que un negocio se coma el mes entero
 * en una tarde —que es justo lo que pasa al cargar un catálogo— y con eso
 * arrastre la cuota diaria de Google que comparten todos. Treinta lo obligaría a
 * usar exactamente una por día, que no es como trabaja nadie: se carga de golpe
 * y después no se toca en dos semanas.
 *
 * Con cuatro, un negocio puede quemar una semana de cupo en un día y seguir
 * teniendo mes. */
const DIAS_PARA_GASTAR_EL_MES = 4;

function topeDiario(mensual: number): number {
  /* El techo técnico sigue mandando: ningún plan puede pedir en un día más de lo
     que la cuota compartida aguanta. Hoy no se toca —quince contra cuarenta— y
     está para que no se pueda tocar sin darse cuenta. */
  return Math.min(Math.ceil(mensual / DIAS_PARA_GASTAR_EL_MES), TOPE_FOTOS_POR_DIA);
}

const TOPES_CATALOGO: TopesDelPlan = { productos: 150, fotosPorProducto: 3 };
const TOPES_ACTIVO: TopesDelPlan = { productos: 300, fotosPorProducto: 4 };

export const PLANES: readonly Plan[] = [
  {
    id: "catalogo",
    nombre: "Catálogo",
    precioBs: PRECIO_MENSUAL_BS,
    topes: TOPES_CATALOGO,
    lecturasPorMes: 10,
    para: "Para la mayoría: un catálogo que se arma una vez y se retoca de vez en cuando.",
    destacado: false,
    incluye: [
      "Tu dirección web propia y tu código QR",
      describirTopes(TOPES_CATALOGO),
      "Pedidos que se cierran por WhatsApp",
      /* Decía «cuatro diseños y siete paletas» y las dos cifras eran falsas:
         las cuatro plantillas se retiraron en la fase 6 y las paletas son
         diez. La cuenta sale del registro para que no vuelva a pasar. */
      `${PALETAS.length} paletas de color y el fondo de tu oficio`,
      "Tu negocio en el directorio público",
      `10 lecturas de foto al mes, hasta ${topeDiario(10)} por día`,
    ],
  },
  {
    id: "activo",
    nombre: "Catálogo Activo",
    precioBs: 150,
    topes: TOPES_ACTIVO,
    lecturasPorMes: 60,
    para: "Con las herramientas de IA: para quien carga y cambia mercadería seguido.",
    destacado: true,
    incluye: [
      "Todo lo del plan Catálogo",
      describirTopes(TOPES_ACTIVO),
      "Herramientas de IA: una foto de tu lista de precios se vuelve productos cargados",
      `60 lecturas de foto al mes, hasta ${topeDiario(60)} por día`,
      "Prioridad cuando escribes por WhatsApp",
    ],
  },
];

/* El pago por año, para quien prefiere resolverlo de una vez.
 *
 * Vale solo para el plan Catálogo, que es el que se ofrece así. El Catálogo
 * Activo no tiene precio anual **a propósito**: inventarle uno proporcional
 * sería publicar un número que nadie decidió, y un precio publicado no se baja
 * después sin quedar mal.
 *
 * El ahorro no se escribe: se calcula. Si mañana el mensual sube y alguien se
 * olvida de tocar la frase de la portada, la portada miente sobre plata.
 */
export const PLAN_ANUAL = {
  planId: "catalogo",
  precioBs: 850,
} as const;

export function precioAnualSuelto(): number {
  const plan = PLANES.find(({ id }) => id === PLAN_ANUAL.planId);
  return (plan?.precioBs ?? 0) * 12;
}

export function ahorroAnualBs(): number {
  return precioAnualSuelto() - PLAN_ANUAL.precioBs;
}

/* La prueba gratis: quince días, quince productos y cinco lecturas de foto.
 *
 * Decisión del dueño (2026-10-22): que quien duda pruebe el sistema de verdad,
 * con su propio catálogo, antes de pagar. Es el plan con que nace todo negocio
 * —la base lo pone por omisión, con el vencimiento a quince días— y el primer
 * pago lo pasa al Catálogo (`admin_renovar_suscripcion`).
 *
 * Las cinco lecturas son **en total**, no por mes: una prueba que empieza el 25
 * no puede leer cinco en octubre y otras cinco en noviembre. Y se pueden usar el
 * mismo día, porque quien prueba quiere ver la herramienta funcionar ya, no
 * repartirla en cuatro días.
 *
 * Los topes los aplica la base (`private.topes_del_plan`, migración
 * `20261113090000_la_prueba_de_quince_dias.sql`), igual que los de los planes
 * pagos. */
export const PLAN_PRUEBA: Plan & { dias: number } = {
  id: "prueba",
  nombre: "Prueba gratis",
  precioBs: 0,
  dias: 15,
  topes: { productos: 15, fotosPorProducto: 3 },
  lecturasPorMes: 5,
  para: "Para conocer el sistema con tu propio catálogo, sin pagar nada.",
  destacado: false,
  incluye: [],
};

/* Cómo se dice la prueba en una línea, igual en la portada, los términos y el
   panel. */
export function describirPrueba(): string {
  return `${PLAN_PRUEBA.dias} días gratis, con hasta ${PLAN_PRUEBA.topes.productos} productos y ${PLAN_PRUEBA.lecturasPorMes} lecturas de foto con IA`;
}

/* La promoción del primer pago (decisión del dueño, 2026-10-22). No la aplica
   la base: la plataforma suma dos meses al renovar por primera vez, y su
   pantalla se lo recuerda. */
export const PROMO_SEGUNDO_MES = "Por adquirir un mes con nosotros, el segundo mes va por nuestra cuenta.";

/* Se cobra una vez y no todos los meses porque el trabajo se hace una vez. Un
   restaurante carga su carta al principio y después suma tres platos al mes:
   cobrarle todos los meses por eso es la forma más rápida de perderlo en el
   tercero. */
/* El plan de un valor que no se reconoce. Es el pago de entrada: un negocio con
   un plan desconocido recibe el básico, en la base y acá. La prueba **no** es el
   valor por omisión de esta función aunque sí lo sea de la columna: leer mal un
   plan no puede dejar a un cliente que pagó con quince productos. */
export const PLAN_POR_OMISION: PlanId = "catalogo";

export function planDe(id: string | null | undefined): Plan {
  if (id === PLAN_PRUEBA.id) return PLAN_PRUEBA;
  return PLANES.find((plan) => plan.id === id) ?? planDe(PLAN_POR_OMISION);
}

export function esPrueba(id: string | null | undefined): boolean {
  return id === PLAN_PRUEBA.id;
}

export function topesDelPlan(id: string | null | undefined): TopesDelPlan {
  return planDe(id).topes;
}

/* Cómo se dice el tope en una línea, igual en la portada, los términos y el
   panel. */
export function describirTopes(topes: TopesDelPlan): string {
  return `Hasta ${topes.productos} productos, con ${topes.fotosPorProducto} fotos cada uno`;
}

/* Cuánto puede leer un plan, al mes y en un día.
 *
 * **Esto es lo que aplica el servidor**, y sale del mismo sitio que la portada
 * publica. Antes eran dos números distintos: la portada prometía 10 y el
 * servidor autorizaba 200, porque el tope se repartía parejo entre diez negocios
 * sin mirar quién pagó qué. */
export function cupoDelPlan(id: string | null | undefined, techoDiario: number) {
  const mensual = planDe(id).lecturasPorMes;

  return {
    mensual,
    /* La prueba no se reparte en días: son cinco y se usan cuando se quiera. */
    diario: Math.min(esPrueba(id) ? mensual : topeDiario(mensual), techoDiario),
  };
}

export const CARGA_INICIAL = {
  precioBs: 250,
  productosMaximos: 150,
} as const;

/* La tarjeta de acrílico para el mostrador o la mesa.
 *
 * Es un producto físico y se cobra aparte, por unidad: **no incluye el mes del
 * catálogo**. Lleva el diseño hecho para el negocio, un código QR y una etiqueta
 * NFC —se acerca el teléfono y abre—, y las dos llevan al catálogo, donde está
 * el botón de calificar en Google Maps. La configuración la hacemos nosotros y
 * va incluida en el precio.
 *
 * Las medidas se publican porque son lo primero que pregunta quien tiene poco
 * mostrador. Van ancho × alto, las dos en la misma proporción de cinco por
 * siete, así el mismo diseño entra en cualquiera de las dos sin rehacerlo. */
export const TARJETA_ACRILICO = {
  nombre: "Tarjeta de mesa",
  precioBs: 90,
  medidas: "12,5 × 17,5 cm",
} as const;

/* La grande, en porta-carteles en L: la placa inclinada y el pie doblado hacia
   adelante, para el mostrador o la entrada, donde se mira de más lejos. Sumada
   el 2026-10-18 para la feria de Oruro. */
export const TARJETA_ACRILICO_GRANDE = {
  nombre: "Tarjeta grande",
  precioBs: 120,
  medidas: "15 × 21 cm",
} as const;

/* El tope técnico por negocio, que ningún plan puede superar. Está acá para que
   se vea que los cupos de arriba caben dentro de él. */
export const TOPE_TECNICO_MENSUAL = TOPE_FOTOS_POR_MES;
