import { TIPOS_NEGOCIO, type TipoNegocio } from "./negocios/validacion";

export type ModoAccionCatalogo = "solo_lectura" | "accion_individual" | "carrito";

export type ComportamientoModalidad = {
  tipo: TipoNegocio;
  accion: ModoAccionCatalogo;
  descripcion: string;
};

const COMPORTAMIENTOS: Record<TipoNegocio, ComportamientoModalidad> = {
  catalogo_estatico: {
    tipo: "catalogo_estatico",
    accion: "solo_lectura",
    descripcion: "Este catálogo es informativo. Consulta al negocio para conocer más detalles.",
  },
  catalogo_cta: {
    tipo: "catalogo_cta",
    accion: "accion_individual",
    descripcion: "Puedes pedir o agendar cada opción directamente por WhatsApp.",
  },
  tienda_virtual: {
    tipo: "tienda_virtual",
    accion: "carrito",
    descripcion: "El cliente agrega varias opciones y prepara un solo pedido por WhatsApp.",
  },
};

export function esTipoNegocio(valor: unknown): valor is TipoNegocio {
  return typeof valor === "string" && TIPOS_NEGOCIO.includes(valor as TipoNegocio);
}

export function obtenerComportamientoModalidad(valor: unknown): ComportamientoModalidad {
  return COMPORTAMIENTOS[esTipoNegocio(valor) ? valor : "catalogo_estatico"];
}
