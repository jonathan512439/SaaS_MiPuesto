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
