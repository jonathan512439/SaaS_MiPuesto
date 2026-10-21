import { evaluarSuscripcion, type EstadoSuscripcion } from "../suscripcion";

export const DIAS_DE_GUARDA = 90;

export type NegocioPlataforma = {
  id: string;
  slug: string;
  nombre: string;
  activo: boolean;
  suspendido_en: string | null;
  suscripcion_vence_en: string;
  creado_en: string;
  foto_ia_habilitada?: boolean;
  /* Qué plan paga. Opcional por lo mismo que `rubro`: las filas anteriores a la
     columna existen, y la base les puso el plan de entrada por omisión. */
  plan_id?: string | null;
  /* Opcional porque la fila puede ser vieja: hay negocios anteriores a que el
     rubro existiera, y son justamente los candidatos a que haya que cambiarlo. */
  rubro?: string | null;
  /* El rubro con el que lo encuentra el cliente (fase 11). Opcional: los
     negocios que nunca eligieron rubro no lo tienen. */
  rubro_publico?: string | null;
};

export type EstadoCliente =
  | "vigente"
  | "por_vencer"
  | "vencida"
  | "suspendido"
  | "fuera_a_mano";

export type ClienteResumen = {
  negocio: NegocioPlataforma;
  estado: EstadoCliente;
  diasRestantes: number;
  diasDeGuardaRestantes: number | null;
  urgencia: number;
};

/* Cinco estados y no dos, porque cada uno pide una acción distinta: al que está
   por vencer se le escribe, al vencido se le insiste, al suspendido se le cobra,
   y al que se bajó a mano no se le toca hasta saber por qué. */
export function resumirCliente(
  negocio: NegocioPlataforma,
  ahora = new Date(),
): ClienteResumen {
  const suscripcion = evaluarSuscripcion(negocio.suscripcion_vence_en, ahora);
  const suspendidoPorPago = !negocio.activo && negocio.suspendido_en !== null;
  const fueraAMano = !negocio.activo && negocio.suspendido_en === null;

  const estado: EstadoCliente = suspendidoPorPago
    ? "suspendido"
    : fueraAMano
      ? "fuera_a_mano"
      : (suscripcion.estado as EstadoSuscripcion);

  return {
    negocio,
    estado,
    diasRestantes: suscripcion.diasRestantes,
    diasDeGuardaRestantes: suspendidoPorPago
      ? calcularGuardaRestante(negocio.suspendido_en as string, ahora)
      : null,
    urgencia: calcularUrgencia(estado, suscripcion.diasRestantes),
  };
}

/* Los datos se guardan noventa días desde que el catálogo sale de línea, como
   prometen los términos. Saber cuántos quedan es lo que permite escribir antes
   de que sea tarde. */
function calcularGuardaRestante(suspendidoEn: string, ahora: Date) {
  const dias = Math.floor(
    (ahora.getTime() - new Date(suspendidoEn).getTime()) / 86_400_000,
  );
  return DIAS_DE_GUARDA - dias;
}

/* Ordena por lo que hay que atender primero, no por fecha: quien está a punto de
   perder sus datos va antes que quien vence dentro de un mes. */
function calcularUrgencia(estado: EstadoCliente, diasRestantes: number) {
  switch (estado) {
    case "suspendido":
      return 0;
    case "vencida":
      return 1;
    case "por_vencer":
      return 2 + Math.max(0, diasRestantes) / 100;
    case "fuera_a_mano":
      return 8;
    default:
      return 9 + Math.max(0, diasRestantes) / 1000;
  }
}

export function ordenarPorUrgencia(clientes: ClienteResumen[]): ClienteResumen[] {
  return [...clientes].sort(
    (a, b) => a.urgencia - b.urgencia || a.negocio.nombre.localeCompare(b.negocio.nombre),
  );
}

export const ETIQUETAS_ESTADO: Record<EstadoCliente, string> = {
  suspendido: "Fuera de línea por falta de pago",
  vencida: "Venció, todavía en línea",
  por_vencer: "Por vencer",
  fuera_a_mano: "Bajado a mano",
  vigente: "Al día",
};

/* El estado en una o dos palabras, para la insignia de cada fila. La frase
   larga de `ETIQUETAS_ESTADO` dice lo mismo con más detalle, y en una lista
   que se recorre de un vistazo lo que se lee es la insignia. */
export const ESTADO_CORTO: Record<EstadoCliente, string> = {
  suspendido: "Fuera de línea",
  vencida: "Vencida",
  por_vencer: "Por vencer",
  fuera_a_mano: "Bajado a mano",
  vigente: "Al día",
};

/* Los filtros de la lista de negocios, por lo que hay que hacer con cada uno y
 * no por estado técnico: «necesitan atención» junta a los que hay que
 * escribirles hoy —vencidos, por vencer, fuera de línea por falta de pago—.
 *
 * Viajan en la dirección (`?estado=`), como las pestañas y los filtros del
 * catálogo: un enlace a «necesitan atención» se puede guardar. */
export const FILTROS_CLIENTES = [
  { id: "todos", titulo: "Todos", estados: null },
  { id: "atencion", titulo: "Necesitan atención", estados: ["suspendido", "vencida", "por_vencer"] },
  { id: "al_dia", titulo: "Al día", estados: ["vigente"] },
  { id: "bajados", titulo: "Bajados a mano", estados: ["fuera_a_mano"] },
] as const satisfies ReadonlyArray<{ id: string; titulo: string; estados: ReadonlyArray<EstadoCliente> | null }>;

export type FiltroClientes = (typeof FILTROS_CLIENTES)[number]["id"];

/* Lo que venga en la dirección puede ser cualquier cosa: cae en «Todos». */
export function leerFiltroClientes(valor: unknown): FiltroClientes {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return FILTROS_CLIENTES.find(({ id }) => id === texto)?.id ?? "todos";
}

export function filtrarClientes(clientes: ReadonlyArray<ClienteResumen>, filtro: FiltroClientes): ClienteResumen[] {
  const estados = FILTROS_CLIENTES.find(({ id }) => id === filtro)?.estados ?? null;
  return estados === null
    ? [...clientes]
    : clientes.filter(({ estado }) => (estados as ReadonlyArray<EstadoCliente>).includes(estado));
}
