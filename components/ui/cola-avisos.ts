import type { VarianteToast } from "./toast";

export type Aviso = {
  id: string;
  titulo: string;
  mensaje?: string;
  variante: VarianteToast;
  restante: number;
};

/* La cola avanza con un solo intervalo compartido en vez de un temporizador por
   aviso: así pausar y reanudar es cambiar una condición, no cancelar y recrear
   temporizadores sueltos que sobreviven al desmontaje. */
export const DURACION_AVISO = 5000;
export const INTERVALO_AVISO = 250;
export const MAXIMO_AVISOS = 3;

export type AccionCola =
  | { tipo: "mostrar"; aviso: Aviso }
  | { tipo: "cerrar"; id: string }
  | { tipo: "transcurrir"; ms: number };

export function reducirCola(avisos: Aviso[], accion: AccionCola): Aviso[] {
  switch (accion.tipo) {
    case "mostrar":
      return [...avisos, accion.aviso].slice(-MAXIMO_AVISOS);
    case "cerrar":
      return avisos.filter((aviso) => aviso.id !== accion.id);
    case "transcurrir":
      return avisos
        .map((aviso) => ({ ...aviso, restante: aviso.restante - accion.ms }))
        .filter((aviso) => aviso.restante > 0);
  }
}
