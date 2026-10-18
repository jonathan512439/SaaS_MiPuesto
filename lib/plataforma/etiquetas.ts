import { DOMINIO_MIPUESTO, obtenerUrlBaseSitio } from "../url-sitio";

/* Un código de etiqueta se dicta por teléfono más veces de lo que uno cree —«el
   de la mesa cuatro no anda, ¿cuál era?»—, así que el alfabeto deja fuera lo
   que se confunde al escucharlo o al leerlo: las vocales (para que no salgan
   palabras por casualidad), la O y el 0, la I y el 1, la S y el 5. */
const ALFABETO = "BCDFGHJKLMNPQRTVWXYZ2346789";

export const LARGO_CODIGO_ETIQUETA = 6;
export const PATRON_CODIGO_ETIQUETA = /^[A-Z0-9]{6}$/;

export function generarCodigoEtiqueta(aleatorio: () => number = Math.random): string {
  let codigo = "";
  for (let indice = 0; indice < LARGO_CODIGO_ETIQUETA; indice += 1) {
    codigo += ALFABETO[Math.floor(aleatorio() * ALFABETO.length)];
  }
  return codigo;
}

export function esCodigoEtiqueta(valor: unknown): valor is string {
  return typeof valor === "string" && PATRON_CODIGO_ETIQUETA.test(valor);
}

export function normalizarCodigoEtiqueta(valor: unknown): string {
  return typeof valor === "string" ? valor.trim().toUpperCase() : "";
}

/* Lo que se graba en la etiqueta NFC y se imprime en el QR.
 *
 * Siempre con el dominio definitivo y no con la dirección de donde sirve hoy el
 * sitio: la etiqueta es plástico, y si se graba con la dirección provisoria hay
 * que regrabar el lote entero el día que se conecte el dominio. Lo que cambia
 * de negocio es el código, no la dirección. */
export function enlaceDeEtiqueta(codigo: string): string {
  return `https://${DOMINIO_MIPUESTO}/t/${codigo}`;
}

/* Si el sitio ya sirve desde el dominio que se graba en las etiquetas. Mientras
   no, una etiqueta recién grabada no abre nada, y la plataforma lo tiene que
   decir antes de que alguien grabe un lote y crea que está roto. */
export function dominioDeEtiquetasConectado(base: string = obtenerUrlBaseSitio()): boolean {
  const servidor = new URL(base).hostname;
  return servidor === DOMINIO_MIPUESTO || servidor === `www.${DOMINIO_MIPUESTO}`;
}
