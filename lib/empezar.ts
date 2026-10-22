import { TARJETA_ACRILICO, TARJETA_ACRILICO_GRANDE, opcionAlta, type OpcionAlta } from "./planes";
import { esCiudadId, nombreDeCiudad } from "./negocios/lugares";
import { esRubroPublicoId, nombreDeRubroPublico } from "./negocios/rubros-publicos";

/* El formulario corto de `/empezar`, y el mensaje de WhatsApp que arma.
 *
 * No se guarda nada en ningún lado: el alta se cierra conversando, por
 * WhatsApp (decisión del dueño, 2026-10-22). El formulario existe para que el
 * primer mensaje ya traiga lo que siempre hay que preguntar —cómo se llama el
 * negocio, qué vende y dónde—, y así la cuenta de prueba se puede habilitar en
 * la misma respuesta. */

export const LARGO_MAXIMO_NOMBRE_NEGOCIO = 80;

export const OPCIONES_TARJETA = ["ninguna", "mesa", "grande"] as const;
export type OpcionTarjeta = (typeof OPCIONES_TARJETA)[number];

export const OPCIONES_DEMOSTRACION = ["no", "presencial", "videollamada"] as const;
export type OpcionDemostracion = (typeof OPCIONES_DEMOSTRACION)[number];

export type DatosEmpezar = {
  opcion: OpcionAlta;
  negocio: string;
  rubro: string;
  ciudad: string;
  tarjeta: OpcionTarjeta;
  demostracion: OpcionDemostracion;
};

export type ErroresEmpezar = Partial<Record<"negocio" | "rubro" | "ciudad", string>>;

export function validarEmpezar(datos: DatosEmpezar): ErroresEmpezar {
  const errores: ErroresEmpezar = {};
  const negocio = datos.negocio.trim();
  if (!negocio) errores.negocio = "Escribe el nombre de tu negocio.";
  else if (negocio.length > LARGO_MAXIMO_NOMBRE_NEGOCIO) {
    errores.negocio = `Hasta ${LARGO_MAXIMO_NOMBRE_NEGOCIO} letras.`;
  }
  if (!esRubroPublicoId(datos.rubro)) errores.rubro = "Elige qué vendes.";
  if (!esCiudadId(datos.ciudad)) errores.ciudad = "Elige tu ciudad.";
  return errores;
}

/* En minúscula: van a la mitad de la frase («También quiero la tarjeta…»). */
const enFrase = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1);

const TARJETAS: Record<Exclude<OpcionTarjeta, "ninguna">, string> = {
  mesa: `${enFrase(TARJETA_ACRILICO.nombre)} (Bs ${TARJETA_ACRILICO.precioBs})`,
  grande: `${enFrase(TARJETA_ACRILICO_GRANDE.nombre)} (Bs ${TARJETA_ACRILICO_GRANDE.precioBs})`,
};

const DEMOSTRACIONES: Record<Exclude<OpcionDemostracion, "no">, string> = {
  presencial: "Me gustaría que nos reunamos en persona para verlo.",
  videollamada: "Me gustaría verlo antes por videollamada.",
};

/* Un renglón por dato: es lo que se lee de un vistazo en el chat. */
export function armarMensajeEmpezar(datos: DatosEmpezar): string {
  const opcion = opcionAlta(datos.opcion);
  const renglones = [
    `Hola, quiero empezar con MiPuesto: ${opcion.nombre} (${opcion.precio}).`,
    `Negocio: ${datos.negocio.trim()}`,
    `Vendo: ${nombreDeRubroPublico(datos.rubro) ?? "otro rubro"}`,
    `Ciudad: ${nombreDeCiudad(datos.ciudad)}`,
  ];
  if (datos.tarjeta !== "ninguna") renglones.push(`También quiero la ${TARJETAS[datos.tarjeta]}.`);
  if (datos.demostracion !== "no") renglones.push(DEMOSTRACIONES[datos.demostracion]);
  return renglones.join("\n");
}
