import type { TokensDeUrl } from "./sesion-desde-url";

/* Qué decirle a la persona cuando el enlace no abrió sesión.
 *
 * Antes se mostraba siempre el mismo texto —«venció, ya se usó o lo abriste en
 * otro navegador»— sin importar qué había pasado. Alguien que lo abrió en el
 * mismo teléfono, con un enlace recién llegado, lee eso y no tiene nada que
 * hacer con la información: las tres explicaciones que le damos son falsas y la
 * verdadera no está.
 *
 * Supabase manda el motivo en la propia dirección. Traducirlo cuesta nada y
 * convierte un callejón sin salida en algo accionable. */
export type Diagnostico = { titulo: string; detalle: string };

export function explicarFalloDeEnlace(tokens: TokensDeUrl): Diagnostico {
  if (tokens.tipo === "error") {
    /* `otp_expired` es el que aparece cuando el enlace ya fue visitado. Casi
       siempre no lo visitó la persona: lo visitó el antivirus del correo o la
       vista previa del mensaje, antes de que ella tocara nada. */
    if (tokens.codigo === "otp_expired" || tokens.mensaje.includes("expired")) {
      return {
        titulo: "El enlace ya fue usado o venció",
        detalle:
          "Si acabás de pedirlo y no lo abriste antes, es probable que el antivirus de tu correo lo haya visitado primero. Pedí uno nuevo y abrilo desde la lista de correos, sin tocar la vista previa.",
      };
    }
    if (tokens.codigo === "access_denied") {
      return {
        titulo: "El enlace fue rechazado",
        detalle: "Pedí uno nuevo. Si vuelve a pasar, avisanos con la hora exacta.",
      };
    }
    return {
      titulo: "El enlace llegó con un error",
      detalle: tokens.mensaje || tokens.codigo || "Pedí uno nuevo desde Recuperar contraseña.",
    };
  }

  /* Sin nada en la dirección: o se entró a mano a esta página, o algo quitó los
     datos por el camino. No es lo mismo que un enlace vencido y no conviene
     decirlo como si lo fuera. */
  if (tokens.tipo === "ninguno") {
    return {
      titulo: "Entraste sin un enlace",
      detalle:
        "Esta página se abre desde el enlace que te llega por correo. Pedí uno desde Recuperar contraseña.",
    };
  }

  return {
    titulo: "No pudimos abrir la sesión",
    detalle:
      "El enlace traía los datos pero el navegador no los aceptó. Probá con otro navegador o avisanos.",
  };
}
