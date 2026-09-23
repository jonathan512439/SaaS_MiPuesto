/* Contacto comercial de MiPuesto, no el del negocio que usa el catálogo. La
   suscripción se vende y se cobra de forma personal, así que este número es la
   única vía de alta y de renovación que ve el usuario. */
export const WHATSAPP_MIPUESTO = "59161832872";

/* El plan de entrada. Subió de 80 a 100 el 2026-09-22: a 11 Bs por dólar, 80
   quedaba por debajo de 10 USD y no cubría el plan pago de Cloudflare más el
   dominio con el primer puñado de clientes. */
export const PRECIO_MENSUAL_BS = 100;

/* Quien desarrolla el producto. Va en el pie de todas las pantallas, incluidos
   los catálogos públicos, donde funciona además como vía de contacto. */
export const DESARROLLADOR = {
  nombre: "JC-DEV",
  url: "https://jc-dev-solutions-web.vercel.app/soluciones",
} as const;

export function construirEnlaceContacto(mensaje: string): string {
  return `https://wa.me/${WHATSAPP_MIPUESTO}?text=${encodeURIComponent(mensaje)}`;
}
