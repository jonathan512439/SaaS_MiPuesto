/* Contacto comercial de MiPuesto, no el del negocio que usa el catálogo. La
   suscripción se vende y se cobra de forma personal, así que este número es la
   única vía de alta y de renovación que ve el usuario. */
export const WHATSAPP_MIPUESTO = "59161832872";

export const PRECIO_MENSUAL_BS = 80;

export function construirEnlaceContacto(mensaje: string): string {
  return `https://wa.me/${WHATSAPP_MIPUESTO}?text=${encodeURIComponent(mensaje)}`;
}
